/**
 * COMPONENTE: ReviewsScreen (Versión Nativa para Android/iOS)
 * PROPÓSITO: Implementa la sección de retroalimentación de pacientes, permitiendo calificar
 * con estrellas (1 a 5) y dejar comentarios escritos sobre servicios médicos específicos del hospital.
 * 
 * JUSTIFICACIÓN DISEÑO/UX:
 * - Persistencia Desconectada (AsyncStorage): Almacena las opiniones directamente en la memoria flash
 *   local del dispositivo móvil. Esto permite un funcionamiento fuera de línea (offline) ideal para
 *   zonas del hospital con mala señal telefónica, y simula el almacenamiento de datos antes de
 *   sincronizarse con una API REST en la nube.
 * - Flexibilidad de Entrada: Proporciona un selector gráfico de estrellas hecho a medida,
 *   un dropdown simulado para seleccionar servicios y un campo multilinea con contador de caracteres
 *   en tiempo real (límite de 300 letras) para evitar desbordamiento visual.
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Librería de persistencia asíncrona clave-valor nativa
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Resena = {
  id: string; // Timestamp serializado
  autor: string;
  calificacion: number; // Ponderación entera del 1 al 5
  comentario: string;
  servicio: string;
  fecha: string; // Formateada según convención local chilena ('es-CL')
};

// ─── Constantes ───────────────────────────────────────────────────────────────
// Identificador único de almacenamiento local para aislar los datos de esta aplicación y versión.
const STORAGE_KEY = 'hggb_resenas_v1';

// Catálogo cerrado de unidades del hospital sujetas a auditoría / opinión por el paciente
const SERVICIOS = [
  'Policlínico de Cardiología',
  'Policlínico de Oncología',
  'Policlínico de Traumatología',
  'Policlínico de Neurología',
  'Policlínico de Pediatría',
  'Urgencias',
  'SOME (Admisión)',
  'Farmacia',
  'Laboratorio',
  'Imagenología',
  'Nutrición',
  'Kinesiología',
  'Otro servicio',
];

const AZUL  = '#1a73e8';
const VERDE = '#2e7d32';
const FONDO = 'themeColors';

// ─── Subcomponentes Internos ─────────────────────────────────────────────────
// Descomponer la pantalla en subcomponentes funcionales mejora la mantenibilidad del código
// y evita re-renderizados innecesarios del formulario completo.

/**
 * SelectorEstrellas:
 * Control táctil personalizado para fijar la calificación.
 * Reemplaza el uso de librerías externas pesadas utilizando caracteres Unicode estándar ('★' y '☆')
 * y escalando su tamaño de forma responsiva para facilitar la interacción de pacientes de la tercera edad.
 */
function SelectorEstrellas({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={st.filаEstrellas}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} style={st.estrellаBtn}>
          <Text style={[st.estrella, n <= valor && st.estrellaActiva]}>
            {n <= valor ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * TarjetaResena:
 * Representación visual (Card) tipo burbuja para desplegar comentarios individuales.
 * Usa interpolación de cadenas para construir la cadena visual de estrellas fijas de forma eficiente.
 */
function TarjetaResena({ resena }: { resena: Resena }) {
  const estrellas = '★'.repeat(resena.calificacion) + '☆'.repeat(5 - resena.calificacion);

  return (
    <View style={st.tarjeta}>
      <View style={st.tarjetaEncabezado}>
        <Text style={st.tarjetaAutor}>👤 {resena.autor}</Text>
        <Text style={st.tarjetaFecha}>{resena.fecha}</Text>
      </View>
      <Text style={st.tarjetaServicio}>🏥 {resena.servicio}</Text>
      <Text style={st.tarjetaEstrellas}>{estrellas}</Text>
      {resena.comentario ? (
        <Text style={st.tarjetaComentario}>{"\""}{resena.comentario}{"\""}</Text>
      ) : null}
    </View>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ReviewsScreen() {
  const [resenas,       setResenas]       = useState<Resena[]>([]);
  const [mostrarForm,   setMostrarForm]   = useState(false); // Conmutador de la visibilidad del formulario de ingreso
  const [autor,         setAutor]         = useState('');
  const [calificacion,  setCalificacion]  = useState(0);
  const [comentario,    setComentario]    = useState('');
  const [servicio,      setServicio]      = useState('');
  const [mostrarServicios, setMostrarServicios] = useState(false); // Controla el despliegue del modal-dropdown de servicios
  const [guardando,     setGuardando]     = useState(false); // Estado de carga para deshabilitar clicks accidentales al guardar
  

  // ── Cargar reseñas guardadas en AsyncStorage al montar ────────────────────
  const cargarResenas = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setResenas(JSON.parse(raw));
    } catch {
      // Control de fallos silencioso: Si el almacenamiento está dañado, se inicializa vacío
    }
  }, []);

  useEffect(() => { cargarResenas(); }, [cargarResenas]);

  // ── Guardar nueva reseña e impactar en AsyncStorage ────────────────────────
  const guardarResena = async () => {
    // Validaciones estrictas previas al procesamiento de persistencia
    if (!autor.trim()) {
      Alert.alert('Falta tu nombre', 'Por favor escribe tu nombre antes de enviar.');
      return;
    }
    if (calificacion === 0) {
      Alert.alert('Falta calificación', 'Por favor selecciona cuántas estrellas merece el servicio.');
      return;
    }
    if (!servicio) {
      Alert.alert('Falta el servicio', 'Por favor selecciona el servicio que visitaste.');
      return;
    }

    setGuardando(true);

    const nueva: Resena = {
      id:           Date.now().toString(), // Generación de clave única usando milisegundos del sistema
      autor:        autor.trim(),
      calificacion,
      comentario:   comentario.trim(),
      servicio,
      // Fecha en formato local chileno, ej: "03 de junio de 2026"
      fecha:        new Date().toLocaleDateString('es-CL', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    }),
    };

    try {
      // Inserción en cabeza (LIFO) para que las opiniones más recientes aparezcan al inicio de la lista
      const actualizadas = [nueva, ...resenas];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
      setResenas(actualizadas);
      limpiarFormulario();
      setMostrarForm(false);
      Alert.alert('¡Gracias!', 'Tu reseña fue guardada correctamente. 🙏');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la reseña. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormulario = () => {
    setAutor('');
    setCalificacion(0);
    setComentario('');
    setServicio('');
    setMostrarServicios(false);
  };

  // Cálculo reactivo del promedio de estrellas acumuladas para desplegar en el encabezado
  const promedio = resenas.length > 0
    ? (resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length).toFixed(1)
    : null;

      const colorScheme = useColorScheme();
      
      const themeColors = Colors[colorScheme ?? 'light'];
      
      
      const [loaded] = useFonts({
    
        'ATTFShinGoProBold':require('@/assets/fonts/ATTFShinGoProDeBold.ttf'),
    
      });
    
      useEffect(() => {
        if (loaded) {
          SplashScreen.hideAsync();
        }
      }, [loaded]);
    
      if (!loaded) {
        return null;
      }
    

  // ─── Renderizado de la Interfaz ───────────────────────────────────────────
  return (
    <SafeAreaView style={st.safeArea}>
      {/* 
       * KeyboardAvoidingView:
       * Componente de utilidad nativo crítico para la experiencia de usuario (UX).
       * Desplaza hacia arriba el formulario de reseña cuando emerge el teclado virtual del celular,
       * evitando que se oculten los inputs de comentario y botones de guardar en pantallas pequeñas.
       * - iOS: Se beneficia del comportamiento 'padding' calculando la altura del teclado.
       * - Android: Tradicionalmente maneja el redimensionamiento a nivel de sistema operativo (manifest),
       *   por lo que se pasa undefined para evitar doble compensación.
       */}
      <KeyboardAvoidingView
        style={st.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        {/* Encabezado con estadísticas rápidas */}
        <View style={st.encabezado}>
          <Text style={st.encabezadoTitulo}>⭐ Reseñas del Hospital</Text>
          {promedio && (
            <Text style={st.promedioTexto}>
              Promedio general: {promedio} / 5  ({resenas.length} reseña{resenas.length !== 1 ? 's' : ''})
            </Text>
          )}
        </View>

        {/* Formulario condicional para redactar nueva opinión */}
        {mostrarForm ? (
          <View style={st.formulario}>
            <Text style={st.formTitulo}>📝 Nueva reseña</Text>

            {/* Fila: Nombre Autor */}
            <Text style={st.etiqueta}>Tu nombre</Text>
            <TextInput
              style={st.input}
              placeholder="Ej: María González"
              placeholderTextColor="#aaa"
              value={autor}
              onChangeText={setAutor}
              maxLength={40}
            />

            {/* Fila: Selector de servicio (Simulación de Dropdown) */}
            <Text style={st.etiqueta}>Servicio visitado</Text>
            <TouchableOpacity
              style={st.selectorServicio}
              onPress={() => setMostrarServicios(!mostrarServicios)}
            >
              <Text style={servicio ? st.servicioSeleccionado : st.servicioPlaceholder}>
                {servicio || 'Seleccionar servicio...'}
              </Text>
              <Text style={st.chevron}>{mostrarServicios ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Opciones desplegables del selector de servicios */}
            {mostrarServicios && (
              <View style={st.listaServicios}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                  {SERVICIOS.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[st.itemServicio, servicio === s && st.itemServicioActivo]}
                      onPress={() => { setServicio(s); setMostrarServicios(false); }}
                    >
                      <Text style={[st.itemServicioTexto, servicio === s && st.itemServicioTextoActivo]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Fila: Calificación en estrellas */}
            <Text style={st.etiqueta}>Calificación</Text>
            <SelectorEstrellas valor={calificacion} onChange={setCalificacion} />

            {/* Fila: Comentario Escrito */}
            <Text style={st.etiqueta}>Comentario (opcional)</Text>
            <TextInput
              style={[st.input, st.inputMultilinea]}
              placeholder="¿Cómo fue tu experiencia en el hospital?"
              placeholderTextColor="#aaa"
              value={comentario}
              onChangeText={setComentario}
              multiline
              numberOfLines={4}
              maxLength={300}
            />
            {/* Indicador numérico dinámico de límite de escritura */}
            <Text style={st.contador}>{comentario.length}/300</Text>

            {/* Botones de acción del formulario */}
            <View style={st.filaBotones}>
              <TouchableOpacity
                style={st.btnCancelar}
                onPress={() => { setMostrarForm(false); limpiarFormulario(); }}
              >
                <Text style={st.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.btnEnviar, guardando && st.btnDeshabilitado]}
                onPress={guardarResena}
                disabled={guardando}
              >
                <Text style={st.btnEnviarTexto}>
                  {guardando ? 'Guardando...' : 'Enviar reseña ✓'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        ) : (
          /* Botón para abrir el formulario (Estado por defecto) */
          <TouchableOpacity style={st.btnNuevaResena} onPress={() => setMostrarForm(true)}>
            <Text style={st.btnNuevaResenaTexto}>+ Escribir una reseña</Text>
          </TouchableOpacity>
        )}

        {/* Listado dinámico de reseñas persistidas (FlatList)
         * Se prefiere FlatList sobre un ScrollView iterativo simple porque renderiza elementos de forma perezosa
         * (Lazy rendering), liberando memoria de la GPU móvil para listas con alta cantidad de registros.
         */}
        {resenas.length === 0 && !mostrarForm ? (
          <View style={st.vacio}>
            <Text style={st.vacioIcono}>💬</Text>
            <Text style={st.vacioTexto}>Aún no hay reseñas.</Text>
            <Text style={st.vacioSubtexto}>¡Sé el primero en compartir tu experiencia!</Text>
          </View>
        ) : (
          <FlatList
            data={resenas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <TarjetaResena resena={item} />}
            contentContainerStyle={st.listaContenido}
            showsVerticalScrollIndicator={false}
          />
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: FONDO },
  flex:       { flex: 1 },

  // Encabezado
  encabezado:      { backgroundColor: AZUL, padding: 20, paddingTop: 24 },
  encabezadoTitulo:{ fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily:'ATTFShinGoProBold',},
  promedioTexto:   { fontSize: 15, color: '#e3f2fd', marginTop: 6 },

  // Botón nueva reseña
  btnNuevaResena:      { margin: 16, backgroundColor: VERDE, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnNuevaResenaTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily:'ATTFShinGoProBold', },

  // Formulario
  formulario:    { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  formTitulo:    { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 16 },
  etiqueta:      { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 12 },
  input:         { backgroundColor: FONDO, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#222', borderWidth: 1, borderColor: '#dde3ea' },
  inputMultilinea: { height: 100, textAlignVertical: 'top' },
  contador:      { textAlign: 'right', fontSize: 12, color: '#aaa', marginTop: 4 },

  // Selector servicio
  selectorServicio:      { backgroundColor: FONDO, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#dde3ea', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  servicioPlaceholder:   { fontSize: 16, color: '#aaa' },
  servicioSeleccionado:  { fontSize: 16, color: '#222', fontWeight: '500' },
  chevron:               { fontSize: 14, color: '#888' },
  listaServicios:        { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dde3ea', marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  itemServicio:          { paddingVertical: 12, paddingHorizontal: 16 },
  itemServicioActivo:    { backgroundColor: '#e3f2fd' },
  itemServicioTexto:     { fontSize: 16, color: '#333' },
  itemServicioTextoActivo: { color: AZUL, fontWeight: 'bold' },

  // Estrellas
  filаEstrellas: { flexDirection: 'row', marginVertical: 8 },
  estrellаBtn:   { padding: 4 },
  estrella:      { fontSize: 36, color: '#ddd' },
  estrellaActiva: { color: '#f9a825' },

  // Botones formulario
  filaBotones:       { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancelar:       { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ccc' },
  btnCancelarTexto:  { fontSize: 16, color: '#666', fontWeight: '600' },
  btnEnviar:         { flex: 2, backgroundColor: AZUL, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnEnviarTexto:    { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  btnDeshabilitado:  { opacity: 0.6 },

  // Lista reseñas
  listaContenido: { padding: 16, gap: 12 },
  tarjeta:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  tarjetaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tarjetaAutor:      { fontSize: 16, fontWeight: 'bold', color: '#222' },
  tarjetaFecha:      { fontSize: 13, color: '#aaa' },
  tarjetaServicio:   { fontSize: 14, color: '#555', marginBottom: 6 },
  tarjetaEstrellas:  { fontSize: 20, color: '#f9a825', marginBottom: 6 },
  tarjetaComentario: { fontSize: 15, color: '#444', fontStyle: 'italic', lineHeight: 22 },

  // Estado vacío
  vacio:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  vacioIcono:   { fontSize: 60, marginBottom: 16 },
  vacioTexto:   { fontSize: 20, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  vacioSubtexto:{ fontSize: 16, color: '#aaa', textAlign: 'center' },
});