/**
 * ARCHIVO: app/(tabs)/Bienvenido.tsx
 * PROPÓSITO: Pantalla de inicio (Dashboard/Bienvenida) de la aplicación.
 * 
 * DESIGN & UX:
 * - Presenta la marca institucional "CS" (Camino a la Salud) con una estética moderna, limpia y premium.
 * - Sirve como portal de bienvenida ofreciendo dos tarjetas de acción directa (Quick Links) 
 *   para iniciar el guiado o ir a la sección de opinión.
 * - Implementa adaptabilidad dinámica de colores basándose en el modo actual del sistema (Light/Dark mode)
 *   y utiliza sombreados suaves y bordes curvados para mayor comodidad visual en pacientes.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export default function BienvenidoScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const themeColors = Colors[colorScheme ?? 'light'];

  // Función de redirección programática hacia otras pantallas del Tab Navigator
  const navegarA = (ruta: '/navigation' | '/reviews') => {
    router.push(ruta);
  };
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
    
  
  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── SECCIÓN A: BRANDING E IDENTIDAD ("CS - Camino a la Salud") ── */}
      <View style={styles.header}>
        {/* Logotipo Conceptual Circular con degradado de color simulado */}
        <View style={[styles.logoContenedor, { borderColor: themeColors.tint }]}>
          <Text style={[styles.logoTexto, { color: themeColors.tint }]}>CS</Text>
        </View>

        {/* Nombre de la Aplicación y Lema */}
        <Text style={[styles.tituloApp, { color: themeColors.text }]}>Camino a la Salud</Text>
        <Text style={styles.subtituloHospital}>Hospital Dr. Guillermo Grant Benavente</Text>
        <View style={[styles.divisor, { backgroundColor: themeColors.tint }]} />
      </View>

      {/* Mensaje de bienvenida al paciente */}
      <View style={styles.bienvenidaBox}>
        <Text style={[styles.bienvenidaTexto, { color: themeColors.text }]}>
          ¡Hola! Te damos la bienvenida a tu guía interactiva de navegación.
          Estamos aquí para ayudarte a encontrar tu destino dentro del hospital sin complicaciones.
        </Text>
      </View>

      {/* ── SECCIÓN B: TARJETAS DE ACCIÓN TÁCTIL (Quick Actions) ── */}
      <View style={styles.seccionAcciones}>

        {/* Tarjeta 1: Iniciar Navegación Indoor */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navegarA('/navigation')}
          style={[styles.tarjeta, { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}
        >
          <View style={styles.tarjetaIconoContenedor}>
            <Text style={styles.tarjetaIcono}>🧭</Text>
          </View>
          <View style={styles.tarjetaInfo}>
            <Text style={[styles.tarjetaTitulo, { color: themeColors.text }]}>Iniciar Navegación</Text>
            <Text style={styles.tarjetaDescripcion}>
              Escanea un código QR en el hospital para saber dónde estás y trazar tu ruta a boxes, SOME, farmacias y más.
            </Text>
          </View>
          <Text style={[styles.tarjetaFlecha, { color: themeColors.tint }]}>➔</Text>
        </TouchableOpacity>

        {/* Tarjeta 2: Ir a Sección de Opinión / Reseñas */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navegarA('/reviews')}
          style={[styles.tarjeta, { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}
        >
          <View style={[styles.tarjetaIconoContenedor, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.tarjetaIcono}>⭐</Text>
          </View>
          <View style={styles.tarjetaInfo}>
            <Text style={[styles.tarjetaTitulo, { color: themeColors.text }]}>Buzón de Opinión</Text>
            <Text style={styles.tarjetaDescripcion}>
              Califica la atención y los servicios que visitaste hoy para ayudarnos a seguir mejorando.
            </Text>
          </View>
          <Text style={[styles.tarjetaFlecha, { color: themeColors.tint }]}>➔</Text>
        </TouchableOpacity>

      </View>

      {/* ── SECCIÓN C: GUÍA RÁPIDA DE USO ── */}
      <View style={[styles.guiaRapida, { borderColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0' }]}>
        <Text style={[styles.guiaTitulo, { color: themeColors.text }]}>¿Cómo funciona?</Text>

        <View style={styles.guiaPaso}>
          <Text style={[styles.guiaNumero, { color: themeColors.tint }]}>1</Text>
          <Text style={styles.guiaTexto}>Busca un código QR de navegación pegado en la pared más cercana.</Text>
        </View>

        <View style={styles.guiaPaso}>
          <Text style={[styles.guiaNumero, { color: themeColors.tint }]}>2</Text>
          <Text style={styles.guiaTexto}>Abre la pestaña Iniciar Navegación y apunta la cámara de tu celular al QR.</Text>
        </View>

        <View style={styles.guiaPaso}>
          <Text style={[styles.guiaNumero, { color: themeColors.tint }]}>3</Text>
          <Text style={styles.guiaTexto}>Selecciona tu sala médica de destino en el listado y sigue el mapa.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContenedor: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
  },
  logoTexto: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  tituloApp: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily:'ATTFShinGoProBold',
  },
  subtituloHospital: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily:'ATTFShinGoProBold',
  },
  divisor: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginTop: 16,
  },
  bienvenidaBox: {
    marginBottom: 28,
  },
  bienvenidaTexto: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#475569',
  },
  seccionAcciones: {
    gap: 16,
    marginBottom: 32,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tarjetaIconoContenedor: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tarjetaIcono: {
    fontSize: 26,
  },
  tarjetaInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  tarjetaTitulo: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily:'ATTFShinGoProBold',
  },
  tarjetaDescripcion: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  tarjetaFlecha: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  guiaRapida: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(100, 116, 139, 0.03)',
  },
  guiaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
    fontFamily:'ATTFShinGoProBold',
  },
  guiaPaso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guiaNumero: {
    fontSize: 15,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'left',
  },
  guiaTexto: {
    flex: 1,
    fontSize: 13.5,
    color: '#64748b',
    lineHeight: 19,
  },
});