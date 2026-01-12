import React, { useState, useEffect } from 'react';
import { ThemeContext } from './themeContext';

export default function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // İlk yüklemede localStorage veya sistem tercihini kontrol et
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme !== null) {
      // localStorage'da kayıtlı tema varsa onu kullan
      const isDark = JSON.parse(storedTheme) === 'dark';
      setIsDarkMode(isDark);
    } else {
      // localStorage'da tema yoksa sistem tercihini kontrol et
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      // Sistem tercihini localStorage'a kaydet
      localStorage.setItem('theme', JSON.stringify(prefersDark ? 'dark' : 'light'));
    }
  }, []);

  // isDarkMode değiştiğinde document.documentElement'e dark class ekle/kaldır
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Tema değiştirme fonksiyonu
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', JSON.stringify(newMode ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
