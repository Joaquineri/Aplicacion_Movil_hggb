import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useFontSize } from '@/context/FontSizeContext';

export const Text = React.forwardRef<RNText, TextProps>(({ style, ...props }, ref) => {
  const { fontSizeMultiplier } = useFontSize();

  const scaledStyle = React.useMemo(() => {
    if (!style) return style;

    // Aplanar cualquier estilo para obtener un único objeto plano
    const flatStyle = StyleSheet.flatten(style);
    if (!flatStyle) return flatStyle;

    const newStyle = { ...flatStyle };

    if (typeof newStyle.fontSize === 'number') {
      newStyle.fontSize = Math.round(newStyle.fontSize * fontSizeMultiplier);
    }
    if (typeof newStyle.lineHeight === 'number') {
      newStyle.lineHeight = Math.round(newStyle.lineHeight * fontSizeMultiplier);
    }

    return newStyle;
  }, [style, fontSizeMultiplier]);

  return <RNText ref={ref} style={scaledStyle} {...props} />;
});

Text.displayName = 'Text';
export default Text;
