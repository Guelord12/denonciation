import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <TouchableOpacity onPress={toggleDarkMode} style={{ padding: 8 }}>
      <Text>{darkMode ? '☀️' : '🌙'}</Text>
    </TouchableOpacity>
  );
}