import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeSetting = 'small' | 'medium' | 'large';

interface FontSizeContextType {
  fontSizeSetting: FontSizeSetting;
  setFontSizeSetting: (setting: FontSizeSetting) => Promise<void>;
  fontSizeMultiplier: number;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const MULTIPLIERS = {
  small: 0.85,
  medium: 1.0,
  large: 1.25,
};

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSizeSetting, setSetting] = useState<FontSizeSetting>('medium');

  useEffect(() => {
    // Cargar preferencia persistida
    const loadPreference = async () => {
      try {
        const val = await AsyncStorage.getItem('fontSizeSetting');
        if (val === 'small' || val === 'medium' || val === 'large') {
          setSetting(val);
        }
      } catch (e) {
        console.error('Error al cargar preferencia de tamaño de letra:', e);
      }
    };
    loadPreference();
  }, []);

  const setFontSizeSetting = async (setting: FontSizeSetting) => {
    try {
      setSetting(setting);
      await AsyncStorage.setItem('fontSizeSetting', setting);
    } catch (e) {
      console.error('Error al guardar preferencia de tamaño de letra:', e);
    }
  };

  const fontSizeMultiplier = MULTIPLIERS[fontSizeSetting];

  return (
    <FontSizeContext.Provider value={{ fontSizeSetting, setFontSizeSetting, fontSizeMultiplier }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize debe usarse dentro de un FontSizeProvider');
  }
  return context;
};
