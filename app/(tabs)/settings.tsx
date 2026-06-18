import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';


import {
  Appearance,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';


export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  

  return (
    
    <ThemedView>
      <View style={styles.encabezado}>
          <Text style={styles.encabezadoTitulo}>⭐ Ajustes </Text>
            </View>
        <Text style={[styles.info, { color: themeColors.text }]}> Cambiar a Modo Oscuro/Claro </Text>
      <Switch style={styles.webFallback}value={colorScheme==='dark'} 
          onChange={() => {
            Appearance.setColorScheme(colorScheme==='dark' ? 'light' : 'dark')
          }}
          />
    </ThemedView>
  );
} 




const styles = StyleSheet.create({
  flex:       { flex: 1 },
  webFallback: {
  flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,

  },
  info: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 20,
  },
  encabezadoTitulo:{ 
    fontSize: 24, fontWeight: 'bold', color: '#fff', 
    fontFamily:'ATTFShinGoProBold',},
  encabezado:      { backgroundColor: '#c41313', padding: 20, paddingTop: 45
   }

,
});