/**
 * ARCHIVO: app/(tabs)/_layout.tsx
 * PROPÓSITO: Configuración de la barra de navegación inferior (Tab Navigator) de la aplicación.
 * 
 * JUSTIFICACIÓN DISEÑO/UX:
 * - Define las tres pestañas principales visibles para el usuario: Inicio, Navegación y Reseñas.
 * - Utiliza `HapticTab` en lugar del botón de pestaña predeterminado para proveer retroalimentación física
 *   háptica discreta (vibración leve) al presionar, mejorando la percepción de calidad de la interfaz.
 * - Oculta rutas internas necesarias pero secundarias o contextuales (como 'map' y 'explore') configurando
 *   su propiedad `href` a `null`, impidiendo que aparezcan como botones en el menú inferior pero manteniéndolas
 *   disponibles en el árbol de rutas de Expo Router.
 */

import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';

import { HapticTab } from '@/components/haptic-tab'; // Botón personalizado con soporte para eventos de vibración física (háptica).
import { IconSymbol } from '@/components/ui/icon-symbol'; // Abstracción para renderizar íconos SF Symbols en iOS e íconos SVG/Material en Android/Web.
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontSize } from '@/context/FontSizeContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { fontSizeMultiplier } = useFontSize();

  const [loaded] = useFonts({

    'ATTFShinGoProBold': require('@/assets/fonts/ATTFShinGoProDeBold.ttf'),


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
    <Tabs
      screenOptions={{
        // Define el color del ícono y texto activo basándose en el color de acento (tint) de la paleta del tema actual.
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Se desactiva el header nativo de cada pestaña porque cada pantalla implementa su propia estructura de cabecera.
        headerShown: false,
        // Asignación global de la retroalimentación háptica para todos los botones de la barra de pestañas.
        tabBarButton: HapticTab,
        // Estilos específicos para mejorar la legibilidad y espaciado de los textos y barra.
        tabBarLabelStyle: { fontSize: Math.round(13 * fontSizeMultiplier), fontWeight: '600', fontFamily: 'ATTFShinGoProBold', },
        tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 5 },
      }}>

      {/* Pestaña: Inicio (Portal de Bienvenida CS - Camino a la Salud) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="house.fill" color={color} />,
        }}
      />

      {/* Pestaña: Navegar (Pantalla principal con escaneo QR y guiado indoor) */}
      <Tabs.Screen
        name="navigation"
        options={{
          title: 'Navegar',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="location.fill" color={color} />,
        }}
      />

      {/* Pestaña: Reseñas (Sección interactiva de feedback de servicios) */}
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Reseñas',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="star.fill" color={color} />,
        }}
      />

      {/* Pestaña: Ajustes (Configuraciones de la aplicación) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="gearshape.fill" color={color} />,
        }}
      />

      {/* 
       * Pestaña Oculta: mapa (map)
       * PROPÓSITO: Renderiza la pantalla nativa de mapa SVG.
       * JUSTIFICACIÓN: Se oculta configurando `href: null`. No se accede directamente a través de una pestaña,
       * sino que se renderiza e interactúa contextualmente desde la pantalla 'navigation'.
       */}
      <Tabs.Screen
        name="map"
        options={{ href: null }}
      />

      {/* Pestaña Oculta: explore (Plantilla por defecto de Expo, oculta en producción) */}
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}