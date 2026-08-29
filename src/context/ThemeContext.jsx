import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // 1. Check explicit local storage choice
    const savedTheme = localStorage.getItem('dockit_theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;

    const savedLegacy = localStorage.getItem('darkMode');
    if (savedLegacy !== null) {
      try {
        return JSON.parse(savedLegacy);
      } catch (e) {}
    }

    // 2. Default to OS level prefers-color-scheme
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('dockit_theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('dockit_theme', 'light');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDark]);

  // Listen to OS system changes if no explicit user lock
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const savedTheme = localStorage.getItem('dockit_theme_explicit');
      if (!savedTheme) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    localStorage.setItem('dockit_theme_explicit', 'true');
    setIsDark((prev) => !prev);
  };

  const setTheme = (themeName) => {
    localStorage.setItem('dockit_theme_explicit', 'true');
    setIsDark(themeName === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, theme: isDark ? 'dark' : 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside provider
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    return {
      isDark,
      toggleTheme: () => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark');
        }
      },
      setTheme: () => {},
      theme: isDark ? 'dark' : 'light',
    };
  }
  return context;
}
