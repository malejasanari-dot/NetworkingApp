import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemeColor } from '../hooks/use-theme-color';

/**
 * ThemeToggleButton — Control global de alternancia de tema (Claro/Oscuro).
 * Consume exclusivamente ThemeContext. Diseñado para integrarse en headerRight
 * del Tab Layout compartido de la aplicación.
 */
export const ThemeToggleButton: React.FC = () => {
  const { isDark, setTheme } = useTheme();
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const primaryColor = useThemeColor({}, 'primary');

  const handlePress = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: cardColor, borderColor }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      accessibilityRole="button"
    >
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={18}
        color={isDark ? '#FFB800' : primaryColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});
