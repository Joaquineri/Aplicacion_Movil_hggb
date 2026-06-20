/**
 * COMPONENTE: NavigationScreen (Versión Nativa para Android/iOS)
 * PROPÓSITO: Implementa el escaneo de códigos QR para establecer la ubicación inicial (origen)
 * del usuario, permite buscar e identificar un destino del hospital, y despliega el mapa SVG
 * junto con instrucciones textuales detalladas paso a paso para el guiado.
 * 
 * JUSTIFICACIÓN ARQUITECTÓNICA Y UX:
 * - Localización Indoor con Códigos QR: La señal GPS no penetra las paredes de hormigón armado de los
 *   hospitales y la infraestructura alternativa (Beacons Bluetooth, WiFi RTT) es sumamente costosa.
 *   Los códigos QR impresos y pegados en la pared ("Usted está aquí") son una solución libre de mantenimiento,
 *   offline-first y de precisión milimétrica para establecer el nodo inicial del usuario en el grafo.
 * - Enrutamiento y Selección: Separa la interfaz en dos flujos claros mediante un panel flotante de altura
 *   dinámica (42% de la pantalla): la selección de destino mediante buscadores y categorías, y la lectura
 *   de instrucciones de navegación una vez definida la ruta.
 */

import { CameraView, useCameraPermissions } from 'expo-camera'; // Módulo nativo para interactuar con la cámara física
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/components/text';

import puntosGeoJson from '@/assets/data/pts_interes_primer_piso.json';
import rutasGeoJson from '@/assets/data/rutas_navegacion_primer_piso.json';
import IndoorMap from './map'; // Renderizador del mapa vectorial SVG

const HEIGHT_EXPANDED = 480;
const HEIGHT_COLLAPSED = 100;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type PuntoInteres = { nombre: string; tipo: string };
type Ruta = { nombre_ruta: string; accesible: string; coordinates: [number, number][] };

// ─── Íconos por tipo ──────────────────────────────────────────────────────────
// Mapeo semántico de tipos de POI a Emojis descriptivos para enriquecer visualmente la lista de selección.
const TIPO_EMOJI: Record<string, string> = {
  box: '🏥',
  some: '📋',
  baño: '🚻',
  baños: '🚻',
  ascensor: '🛗',
  escalera: '🪜',
  secretaria: '🗂️',
  sala_descanso: '💺',
  salida: '🚪',
  seguridad: '🔒',
  oficina: '🏢',
  bodega: '📦',
  Entrada: '🚶',
  default: '📍',
};

// ─── Instrucciones legibles por nombre de ruta ────────────────────────────────
// Diccionario estático que traduce nombres técnicos de la base de datos espacial (SIG)
// a frases de guiado claras en lenguaje natural comprensibles para cualquier paciente.
const INSTRUCCIONES_RUTA: Record<string, string> = {
  ruta_principal: 'Avanza por el pasillo principal',
  ruta_boxes_superior: 'Dirígete hacia los boxes superiores',
  ruta_boxes_medio: 'Avanza hacia los boxes del sector medio',
  ruta_boxes_inferior: 'Continúa hacia los boxes inferiores',
  ruta_boxes_extremo: 'Avanza hacia los boxes del extremo',
  ruta_some: 'Dirígete hacia el sector SOME',
  ruta_secretarias: 'Avanza hacia el sector de secretarías',
  ruta_baños: 'Dirígete hacia los baños públicos',
  ruta_oncologia: 'Avanza hacia el Policlínico de Oncología',
};

// ─── Normalizar texto para matching flexible ──────────────────────────────────
/**
 * normalizar:
 * Remueve tildes, convierte a minúsculas y reemplaza espacios por guiones bajos.
 * JUSTIFICACIÓN: Los nombres de los POIs en el GeoJSON y los códigos QR pueden contener
 * inconsistencias de formato (tildes, espacios). Normalizar asegura una comparación limpia.
 */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Filtro Unicode para remover acentos
    .replace(/[\s-]/g, '_');          // Estandarización de delimitadores de palabra

// ─── Cargar datos desde GeoJSON ───────────────────────────────────────────────
// Actúan como cargadores puros para desacoplar el origen de datos de la lógica del componente.

const cargarDestinos = (): PuntoInteres[] =>
  (puntosGeoJson as any).features.map((f: any) => ({
    nombre: f.properties.nombre_puntointeres,
    tipo: f.properties.tipo_puntointeres,
  }));

const cargarRutas = (): Ruta[] =>
  (rutasGeoJson as any).features.map((f: any) => ({
    nombre_ruta: f.properties.nombre_ruta,
    accesible: f.properties.accesible,
    coordinates: f.geometry.coordinates,
  }));

// ─── Generar instrucciones desde las rutas disponibles ───────────────────────
/**
 * generarInstrucciones:
 * Generador de instrucciones secuenciales basado en reglas espaciales.
 * Analiza el punto de partida (origen) y de destino para construir una lista lineal
 * de directivas en español, indicando bifurcaciones o advertencias de accesibilidad física.
 * 
 * JUSTIFICACIÓN:
 * - Aporta semántica humana a los cálculos del grafo de Dijkstra, indicando giros e inclinaciones.
 * - Valida si el destino de boxes superiores o inferiores requiere rampas y emite alertas de
 *   sillas de ruedas si el usuario transita en modo estándar por zonas no accesibles.
 */
const generarInstrucciones = (
  origenNombre: string,
  destinoNombre: string,
  rutas: Ruta[],
  soloAccesible: boolean
): string[] => {
  const instrucciones: string[] = [];
  instrucciones.push(`📍 Inicio: ${origenNombre.replace(/_/g, ' ')}`);

  // Todo camino del primer piso del hospital inicia cruzando el pasillo principal.
  instrucciones.push('➡️  ' + INSTRUCCIONES_RUTA['ruta_principal']);

  const dest = normalizar(destinoNombre);

  // Reglas heurísticas de ruteo basadas en patrones de nomenclatura de los servicios
  if (dest.includes('box')) {
    const num = parseInt(destinoNombre.replace(/\D/g, ''), 10);
    // Agrupamiento por numeración de salas médicas (Boxes)
    if (num <= 3) instrucciones.push('↗️  ' + INSTRUCCIONES_RUTA['ruta_boxes_superior']);
    else if (num <= 7) instrucciones.push('➡️  ' + INSTRUCCIONES_RUTA['ruta_boxes_medio']);
    else if (num <= 11) instrucciones.push('↘️  ' + INSTRUCCIONES_RUTA['ruta_boxes_inferior']);
    else {
      // Los boxes con números superiores a 11 se ubican en el extremo del pasillo, zona no accesible por rampas directas.
      instrucciones.push('↘️  ' + INSTRUCCIONES_RUTA['ruta_boxes_inferior']);
      if (!soloAccesible)
        instrucciones.push('⚠️  ' + INSTRUCCIONES_RUTA['ruta_boxes_extremo'] + ' (sin acceso para sillas de ruedas)');
      else
        instrucciones.push('⚠️  Esta ruta no está disponible en modo accesible');
    }
  } else if (dest.includes('some')) {
    instrucciones.push('↖️  ' + INSTRUCCIONES_RUTA['ruta_some']);
  } else if (dest.includes('secretaria')) {
    instrucciones.push('↙️  ' + INSTRUCCIONES_RUTA['ruta_secretarias']);
    if (dest.includes('oncologia'))
      instrucciones.push('↙️  ' + INSTRUCCIONES_RUTA['ruta_oncologia']);
  } else if (dest.includes('bano') || dest.includes('baño')) {
    instrucciones.push('➡️  ' + INSTRUCCIONES_RUTA['ruta_baños']);
  }

  instrucciones.push(`🏁 Destino: ${destinoNombre.replace(/_/g, ' ')}`);
  return instrucciones;
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function NavigationScreen() {
  // Manejo de permisos nativos para la cámara del dispositivo móvil
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false); // Previene lecturas redundantes del QR en ráfaga
  const [origen, setOrigen] = useState<string | undefined>(undefined);
  const [destino, setDestino] = useState<string | undefined>(undefined);
  const [modoAccesible, setModoAccesible] = useState(false); // Modifica la ponderación de Dijkstra en el mapa
  const [busqueda, setBusqueda] = useState(''); // Filtro de texto para la lista de POIs
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null); // Filtro por categoría de POI (box, baño, etc)
  const [verInstrucciones, setVerInstrucciones] = useState(false); // Alterna entre ver la lista de POIs y la guía secuencial
  const [devFid, setDevFid] = useState(''); // Resaltador de aristas de desarrollo

  // Control del menú desplegable (Bottom Sheet)
  const [isExpanded, setIsExpanded] = useState(true); // Inicia expandido para facilitar la búsqueda
  const panelAnim = React.useRef(new Animated.Value(1)).current; // 1 = expandido, 0 = colapsado

  // Animación del panel al cambiar el estado isExpanded
  React.useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isExpanded, panelAnim]);

  // Interpolación para el desplazamiento vertical (translateY)
  const translateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [HEIGHT_EXPANDED - HEIGHT_COLLAPSED, 0],
  });

  // Lectura de base de datos espaciales una sola vez al montar
  const todosLosDestinos = useMemo(() => cargarDestinos(), []);
  const todasLasRutas = useMemo(() => cargarRutas(), []);

  // Categorías de servicios disponibles mapeadas dinámicamente para generar la barra horizontal de filtros (Chips)
  const tiposUnicos = useMemo(() => {
    const set = new Set(todosLosDestinos.map(p => p.tipo));
    return Array.from(set).filter(Boolean);
  }, [todosLosDestinos]);

  // Filtrado reactivo en memoria para responder instantáneamente al buscador del usuario
  const destinosFiltrados = useMemo(() => {
    return todosLosDestinos.filter(p => {
      const coincideBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideTipo = tipoFiltro ? p.tipo === tipoFiltro : true;
      return coincideBusqueda && coincideTipo;
    });
  }, [todosLosDestinos, busqueda, tipoFiltro]);

  // Recalcular lista de instrucciones textuales al alterar origen, destino o el conmutador de accesibilidad
  const instrucciones = useMemo(() => {
    if (!origen || !destino) return [];
    return generarInstrucciones(origen, destino, todasLasRutas, modoAccesible);
  }, [origen, destino, todasLasRutas, modoAccesible]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * handleBarCodeScanned:
   * Callback ejecutado al enfocar un código QR legible.
   * Parsea la cadena JSON codificada en el QR físico para extraer la ID de ubicación de origen.
   */
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      if (parsed.origen_id) {
        // FIX CRÍTICO: Registramos la posición física del usuario enlazándola al nodo GeoJSON.
        const origenNormalizado = parsed.origen_id;
        setOrigen(origenNormalizado);
      } else {
        Alert.alert('QR Inválido', 'Este código no pertenece al sistema del HGGB.');
        setScanned(false);
      }
    } catch {
      Alert.alert('Error', 'Formato de código QR no reconocido.');
      setScanned(false);
    }
  };

  /**
   * simularEscaneo:
   * Función para propósitos de pruebas internas.
   * Evita tener que imprimir un código QR físico para probar la navegación en simulador / emulador.
   */
  const simularEscaneo = () => {
    handleBarCodeScanned({ data: '{"origen_id": "Entrada_San_Martin", "piso": 1}' });
  };

  /**
   * reiniciar:
   * Limpia la máquina de estados del guiado, devolviendo al usuario a la pantalla de escaneo QR.
   */
  const reiniciar = () => {
    setScanned(false);
    setOrigen(undefined);
    setDestino(undefined);
    setBusqueda('');
    setTipoFiltro(null);
    setVerInstrucciones(false);
    setDevFid('');
  };

  const seleccionarDestino = (nombre: string) => {
    setDestino(nombre);
    setVerInstrucciones(false); // Resetea la visualización del panel flotante para enfocar la lista de destinos primero
    setIsExpanded(false); // Colapsa automáticamente el panel al origen (base) al seleccionar el destino
  };

  // ── Control de Permisos de Cámara ──────────────────────────────────────────
  if (!permission) return <View style={s.container} />; // Estado de carga inicial mientras consulta la API del sistema operativo

  // Caso: Permiso de cámara denegado por el usuario. Despliega una interfaz explicativa.
  if (!permission.granted) {
    return (
      <SafeAreaView style={s.centrado}>
        <Text style={s.iconoGrande}>📷</Text>
        <Text style={s.textoPermiso}>
          La app necesita acceso a tu cámara para leer los códigos QR del hospital.
        </Text>
        <TouchableOpacity style={s.btnPrimario} onPress={requestPermission}>
          <Text style={s.btnPrimarioTexto}>Dar permiso a la cámara</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── ESTADO 1: Vista activa del Escáner QR ─────────────────────────────────
  // Si no hay un nodo de origen registrado en el estado, se despliega la cámara en pantalla completa.
  if (!origen) {
    return (
      <View style={s.container}>
        {/* Renderiza el flujo nativo de la cámara buscando metadatos de barras/QR */}
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {/* Máscara opaca superior (Overlay) para orientar al usuario en el centrado del QR */}
        <View style={s.overlayQR}>
          <Text style={s.tituloQR}>📍 ¿Dónde estás?</Text>
          <Text style={s.instruccionQR}>
            Busca un código QR pegado en la pared más cercana y apunta la cámara hacia él
          </Text>
          {/* Rectángulo guía visual para el encuadre óptimo */}
          <View style={s.marcoQR} />
          {/* Botón de omisión/desarrollo para simular pruebas en el hospital */}
          <TouchableOpacity style={s.btnSimular} onPress={simularEscaneo}>
            <Text style={s.btnSimularTexto}>[DEV] Simular escaneo en Entrada San Martín</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── ESTADO 2: Mapa Activo + Panel de Control Flotante ─────────────────────
  // Se renderiza cuando la ubicación de origen ya fue obtenida mediante el QR.
  return (
    <View style={s.container}>

      {/* Contenedor del Mapa — Ocupa pantalla completa por detrás */}
      <View style={s.mapaContainerAbsolute}>
        <IndoorMap
          origen_id={origen}
          destino_id={destino}
          soloAccesible={modoAccesible}
          highlightedFid={devFid ? Number(devFid) : undefined}
        />
      </View>

      {/* Panel Desplegable (Bottom Sheet) con animación de deslizamiento vertical */}
      <Animated.View style={[s.panel, { transform: [{ translateY }] }]}>

        {/* Cabecera táctil del panel / Tirador de arrastre */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsExpanded(!isExpanded)}
          style={s.tiradorHeader}
        >
          {/* Tirador visual de arrastre */}
          <View style={s.tiradorBar} />

          {/* Si está contraído, mostrar resumen compacto */}
          {!isExpanded && (
            <View style={s.panelCompactoContenido}>
              {destino ? (
                <View style={s.compactFila}>
                  <Text style={s.compactTexto} numberOfLines={1}>
                    🧭 Guía a: <Text style={s.compactDestino}>{destino.replace(/_/g, ' ')}</Text>
                  </Text>
                  <View style={s.compactAcciones}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={s.compactBtnIndicaciones}
                      onPress={() => {
                        setVerInstrucciones(true);
                        setIsExpanded(true);
                      }}
                    >
                      <Text style={s.compactBtnIndicacionesTexto}>📋 Ver Guía</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={s.compactBtnCambiar}
                      onPress={() => {
                        setDestino(undefined);
                        setIsExpanded(true);
                      }}
                    >
                      <Text style={s.compactBtnCambiarTexto}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={s.panelTituloCompacto}>
                  🔍 Toca aquí para buscar tu destino...
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Contenido Completo del Panel (solo visible e interactivo si está expandido) */}
        <Animated.View style={{ flex: 1, opacity: panelAnim }} pointerEvents={isExpanded ? 'auto' : 'none'}>
          {/* Barra selectora de pestañas internas (Conmutador) */}
          {destino && (
            <View style={s.toggleBar}>
              <TouchableOpacity
                style={[s.toggleBtn, !verInstrucciones && s.toggleBtnActivo]}
                onPress={() => setVerInstrucciones(false)}
              >
                <Text style={[s.toggleTexto, !verInstrucciones && s.toggleTextoActivo]}>
                  🗺️ Destinos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, verInstrucciones && s.toggleBtnActivo]}
                onPress={() => setVerInstrucciones(true)}
              >
                <Text style={[s.toggleTexto, verInstrucciones && s.toggleTextoActivo]}>
                  📋 Instrucciones
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Indicador de Destino Activo */}
          {destino ? (
            <View style={s.destinoActivo}>
              <Text style={s.destinoActivoTexto}>
                🧭 <Text style={s.destinoActivoNombre}>{destino.replace(/_/g, ' ')}</Text>
              </Text>
              <TouchableOpacity onPress={() => { setDestino(undefined); setIsExpanded(true); }}>
                <Text style={s.cambiarDestino}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={s.panelTitulo}>¿A dónde te diriges?</Text>
          )}

          {/* ── SECCIÓN A: Vista de Instrucciones paso a paso ── */}
          {verInstrucciones && destino ? (
            <ScrollView style={s.listaInstrucciones} showsVerticalScrollIndicator={false}>
              {instrucciones.map((paso, i) => (
                <View key={i} style={[
                  s.itemInstruccion,
                  i === 0 && s.itemInstruccionInicio, // Color verde para indicar punto de salida
                  i === instrucciones.length - 1 && s.itemInstruccionFin, // Color rojo para indicar punto de llegada
                ]}>
                  <Text style={s.itemInstruccionTexto}>{paso}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            /* ── SECCIÓN B: Vista de búsqueda y selección de destinos ── */
            <>
              {/* Buscador de servicios médicos */}
              <View style={s.buscadorContainer}>
                <TextInput
                  style={s.buscador}
                  placeholder="🔍  Buscar servicio o sala..."
                  placeholderTextColor="#999"
                  value={busqueda}
                  onChangeText={setBusqueda}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Input de depuración para iluminar pasillos (FIDs) */}
              <View style={s.buscadorContainer}>
                <TextInput
                  style={[s.buscador, { borderColor: '#e91e63', borderWidth: 1.5 }]}
                  placeholder="🛠️  [DEV] Resaltar ID de ruta (FID)..."
                  placeholderTextColor="#e91e63"
                  keyboardType="numeric"
                  value={devFid}
                  onChangeText={setDevFid}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Fila deslizable horizontalmente para filtrar por categorías (Chips) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.filtrosScroll}
                contentContainerStyle={s.filtrosContenido}
              >
                <TouchableOpacity
                  style={[s.chipFiltro, !tipoFiltro && s.chipFiltroActivo]}
                  onPress={() => setTipoFiltro(null)}
                >
                  <Text style={[s.chipTexto, !tipoFiltro && s.chipTextoActivo]}>Todos</Text>
                </TouchableOpacity>
                {tiposUnicos.map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[s.chipFiltro, tipoFiltro === tipo && s.chipFiltroActivo]}
                    onPress={() => setTipoFiltro(tipoFiltro === tipo ? null : tipo)}
                  >
                    <Text style={[s.chipTexto, tipoFiltro === tipo && s.chipTextoActivo]}>
                      {TIPO_EMOJI[tipo] || '📍'} {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lista principal vertical de destinos filtrados */}
              <FlatList
                data={destinosFiltrados}
                keyExtractor={(item, i) => `${item.nombre}-${i}`}
                style={s.listaDestinos}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.itemDestino, destino === item.nombre && s.itemDestinoActivo]}
                    onPress={() => seleccionarDestino(item.nombre)}
                  >
                    <Text style={s.itemIcono}>{TIPO_EMOJI[item.tipo] || '📍'}</Text>
                    <Text style={s.itemNombre}>{item.nombre.replace(/_/g, ' ')}</Text>
                    {destino === item.nombre && <Text style={s.checkDestino}>✓</Text>}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={s.sinResultados}>No se encontraron servicios</Text>
                }
              />
            </>
          )}

          {/* ── Fila de Controles Inferiores (Configuración de accesibilidad y reset) ── */}
          <View style={s.filaControles}>
            {/* Conmutador de ruta adaptada para personas con movilidad reducida (sillas de ruedas) */}
            <TouchableOpacity
              style={[s.btnAccesibilidad, modoAccesible && s.btnAccesibilidadActivo]}
              onPress={() => setModoAccesible(!modoAccesible)}
            >
              <Text style={s.btnAccesibilidadTexto}>
                {modoAccesible ? '♿ Silla de ruedas' : '🚶 Ruta estándar'}
              </Text>
            </TouchableOpacity>
            {/* Botón para reiniciar la navegación y volver a escanear un código QR */}
            <TouchableOpacity style={s.btnReiniciar} onPress={reiniciar}>
              <Text style={s.btnReiniciarTexto}>🔄 Reiniciar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const AZUL = '#1a73e8';
const ROJO = '#e53935';
const VERDE = '#2e7d32';
const FONDO = '#f0f4f8';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  iconoGrande: { fontSize: 60, marginBottom: 20 },

  // Permisos
  textoPermiso: { fontSize: 18, textAlign: 'center', color: '#333', marginBottom: 30, lineHeight: 26 },
  btnPrimario: { backgroundColor: AZUL, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14 },
  btnPrimarioTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // QR
  overlayQR: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  tituloQR: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 16, fontFamily: 'ATTFShinGoProBold', },
  instruccionQR: { fontSize: 18, color: '#fff', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  marcoQR: { width: 220, height: 220, borderWidth: 3, borderColor: '#fff', borderRadius: 16, marginBottom: 40 },
  btnSimular: { backgroundColor: ROJO, padding: 14, borderRadius: 10, borderWidth: 2, borderColor: '#fff' },
  btnSimularTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Layout
  mapaContainerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fafafa',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HEIGHT_EXPANDED,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingBottom: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tiradorHeader: {
    width: '100%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tiradorBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#cbd5e1',
    marginBottom: 8,
  },
  panelCompactoContenido: {
    width: '100%',
    paddingHorizontal: 6,
  },
  compactFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 36,
  },
  compactTexto: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
    marginRight: 10,
  },
  compactDestino: {
    fontWeight: 'bold',
    color: VERDE,
  },
  compactAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  compactBtnIndicaciones: {
    backgroundColor: AZUL,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  compactBtnIndicacionesTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  compactBtnCambiar: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  compactBtnCambiarTexto: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
  panelTituloCompacto: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Toggle destinos / instrucciones
  toggleBar: { flexDirection: 'row', backgroundColor: FONDO, borderRadius: 12, marginBottom: 10, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleBtnActivo: { backgroundColor: '#fff', elevation: 2 },
  toggleTexto: { fontSize: 14, color: '#888', fontWeight: '600' },
  toggleTextoActivo: { color: AZUL },

  // Destino activo
  destinoActivo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#e8f5e9', padding: 10, borderRadius: 10 },
  destinoActivoTexto: { fontSize: 14, color: '#333' },
  destinoActivoNombre: { fontWeight: 'bold', color: VERDE },
  cambiarDestino: { color: AZUL, fontWeight: 'bold', fontSize: 14 },
  panelTitulo: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 10, textAlign: 'center' },

  // Instrucciones
  listaInstrucciones: { flex: 1, marginBottom: 8 },
  itemInstruccion: { backgroundColor: FONDO, borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: AZUL },
  itemInstruccionInicio: { borderLeftColor: VERDE },
  itemInstruccionFin: { borderLeftColor: ROJO },
  itemInstruccionTexto: { fontSize: 15, color: '#333', lineHeight: 22 },

  // Buscador
  buscadorContainer: { marginBottom: 8 },
  buscador: { backgroundColor: FONDO, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#222', borderWidth: 1, borderColor: '#dde3ea' },

  // Chips
  filtrosScroll: { marginBottom: 8 },
  filtrosContenido: { paddingRight: 16, gap: 8, flexDirection: 'row' },
  chipFiltro: { backgroundColor: FONDO, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#dde3ea' },
  chipFiltroActivo: { backgroundColor: AZUL, borderColor: AZUL },
  chipTexto: { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextoActivo: { color: '#fff' },

  // Lista destinos
  listaDestinos: { flex: 1, marginBottom: 6 },
  itemDestino: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 5, backgroundColor: FONDO },
  itemDestinoActivo: { backgroundColor: '#e3f2fd', borderWidth: 1.5, borderColor: AZUL },
  itemIcono: { fontSize: 20, marginRight: 10 },
  itemNombre: { fontSize: 15, color: '#222', flex: 1, fontWeight: '500' },
  checkDestino: { fontSize: 18, color: AZUL, fontWeight: 'bold' },
  sinResultados: { textAlign: 'center', color: '#999', fontSize: 15, paddingVertical: 16 },

  // Controles
  filaControles: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnAccesibilidad: { flex: 2, backgroundColor: FONDO, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cfd8dc' },
  btnAccesibilidadActivo: { backgroundColor: '#e3f2fd', borderColor: AZUL },
  btnAccesibilidadTexto: { fontSize: 14, fontWeight: 'bold', color: '#444' },
  btnReiniciar: { flex: 1, backgroundColor: ROJO, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnReiniciarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});