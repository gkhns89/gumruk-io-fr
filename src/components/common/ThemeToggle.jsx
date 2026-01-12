import React from 'react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div
      className="theme-toggle"
      onClick={toggleTheme}
      role="button"
      aria-label="Toggle dark mode"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
    >
      <div className={`theme-toggle-inner ${isDarkMode ? 'active' : ''}`} />
    </div>
  );
}
