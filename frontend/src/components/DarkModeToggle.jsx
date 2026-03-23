import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle = () => {
  const { darkMode, setDarkMode } = useTheme();
  return (
    <button onClick={() => setDarkMode(!darkMode)} className="dark-mode-toggle" style={{ background: 'none', padding: '0.5rem' }}>
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
};

export default DarkModeToggle;