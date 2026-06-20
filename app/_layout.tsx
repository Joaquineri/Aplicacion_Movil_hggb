/**
 * ARCHIVO: app/_layout.tsx
 * PROPÓSITO: Punto de entrada y maquetación raíz (Root Layout) de la aplicación.
 * 
 * JUSTIFICACIÓN ARQUITECTÓNICA:
 * - Expo Router utiliza enrutamiento basado en archivos. Este archivo define la estructura
 *   de navegación más alta en la jerarquía (un contenedor de tipo Stack).
 * - Centraliza los proveedores globales (Providers) como el ThemeProvider para asegurar
 *   coherencia visual en toda la aplicación.
 * - Importa efectos secundarios globales necesarios, como la inicialización de react-native-reanimated.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated'; // Inicializa el motor de animaciones nativas Reanimated a nivel global para transiciones fluidas.

import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontSizeProvider } from '@/context/FontSizeContext';

/**
 * CONFIGURACIÓN DE ENRUTAMIENTO (unstable_settings):
 * Se establece '(tabs)' como el punto de anclaje (anchor) predeterminado para la navegación.
 * Esto asegura que ante una recarga en desarrollo (Fast Refresh) o al resolver enlaces directos (Deep Linking),
 * el router sepa redirigir correctamente al contenedor principal de pestañas.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // hook personalizado que detecta el tema activo del sistema operativo (light o dark)
  const colorScheme = useColorScheme();

  return (
    /* 
     * ThemeProvider: Inyecta el tema seleccionado a todo el árbol de navegación.
     * Facilita el soporte nativo para el modo oscuro/claro, cumpliendo con buenas prácticas de UX.
     */
    <FontSizeProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* 
         * Stack Navigator: Administrador de navegación global basado en pila.
         * Permite superponer pantallas. En este caso, maneja el flujo principal (tabs) y pantallas modales auxiliares.
         */}
        <Stack>
          {/* Pantalla principal que encapsula las pestañas de la aplicación. Se oculta el encabezado nativo ya que se maneja de forma customizada. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Pantalla modal secundaria. Se configura con presentación 'modal' para emerger desde abajo, patrón común para formularios o información rápida. */}
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        {/* StatusBar: Barra de estado nativa adaptativa (hora, batería, señal) según el contraste del fondo del tema actual. */}
        <StatusBar style="auto" />
      </ThemeProvider>
    </FontSizeProvider>
  );
}

