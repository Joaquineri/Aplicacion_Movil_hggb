import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import {
  Appearance,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/components/text';
import { useFontSize, FontSizeSetting } from '@/context/FontSizeContext';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { fontSizeSetting, setFontSizeSetting } = useFontSize();

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

  const sizes: { key: FontSizeSetting; label: string }[] = [
    { key: 'small', label: 'Pequeño' },
    { key: 'medium', label: 'Mediano' },
    { key: 'large', label: 'Grande' },
  ];

  return (
    <ThemedView style={styles.contenedorPrincipal}>
      {/* Encabezado */}
      <View style={styles.encabezado}>
        <Text style={styles.encabezadoTitulo}>⭐ Ajustes </Text>
      </View>

      {/* Contenedor de Ajustes */}
      <View style={styles.configContenedor}>
        
        {/* Opción 1: Modo Oscuro/Claro */}
        <View style={[styles.tarjetaConfig, { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}>
          <View style={styles.tarjetaHeader}>
            <Text style={[styles.tarjetaTitulo, { color: themeColors.text }]}>🌓 Modo Oscuro</Text>
            <Switch
              value={colorScheme === 'dark'}
              onValueChange={() => {
                Appearance.setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
              }}
              trackColor={{ false: '#cbd5e1', true: themeColors.tint }}
              thumbColor={colorScheme === 'dark' ? '#f8fafc' : '#f1f5f9'}
            />
          </View>
          <Text style={[styles.tarjetaSubtitulo, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
            Cambia entre el tema claro y oscuro para tu comodidad visual.
          </Text>
        </View>

        {/* Opción 2: Tamaño de Letra */}
        <View style={[styles.tarjetaConfig, { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}>
          <Text style={[styles.tarjetaTitulo, { color: themeColors.text, marginBottom: 12 }]}>
            📏 Tamaño de Letra
          </Text>
          
          {/* Botones Segmentados */}
          <View style={styles.selectorGrupo}>
            {sizes.map((sz) => {
              const activo = fontSizeSetting === sz.key;
              return (
                <TouchableOpacity
                  key={sz.key}
                  activeOpacity={0.8}
                  onPress={() => setFontSizeSetting(sz.key)}
                  style={[
                    styles.selectorBoton,
                    activo && { backgroundColor: '#1a73e8' },
                    !activo && { backgroundColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0' }
                  ]}
                >
                  <Text
                    style={[
                      styles.selectorTexto,
                      { color: activo ? '#fff' : themeColors.text, fontWeight: activo ? 'bold' : '600' }
                    ]}
                  >
                    {sz.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vista Previa */}
          <View style={[styles.vistaPreviaContenedor, { borderColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0' }]}>
            <Text style={[styles.vistaPreviaEtiqueta, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              Vista previa del texto
            </Text>
            <Text style={[styles.vistaPreviaTexto, { color: themeColors.text }]}>
              El tamaño de la letra de la aplicación se ajustará a este tamaño. Elige la opción que te resulte más cómoda para leer la información del hospital.
            </Text>
          </View>
        </View>

      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
  },
  encabezado: {
    backgroundColor: '#1a73e8',
    padding: 20,
    paddingTop: 45,
  },
  encabezadoTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'ATTFShinGoProBold',
  },
  configContenedor: {
    padding: 20,
    gap: 20,
  },
  tarjetaConfig: {
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tarjetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tarjetaTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'ATTFShinGoProBold',
  },
  tarjetaSubtitulo: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectorGrupo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  selectorBoton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTexto: {
    fontSize: 14,
  },
  vistaPreviaContenedor: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(100, 116, 139, 0.02)',
  },
  vistaPreviaEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  vistaPreviaTexto: {
    fontSize: 15,
    lineHeight: 22,
  },
});