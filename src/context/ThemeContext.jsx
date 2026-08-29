import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function getInitialTheme() {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem('dockit_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    if (localStorage.getItem('darkMode') === 'true') return true;
    if (localStorage.getItem('darkMode') === 'false') return false;
    if (document.documentElement.classList.contains('dark')) return true;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    return false;
  }
}

export function applyTheme(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    if (body) body.classList.add('dark');
    localStorage.setItem('dockit_theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    if (body) body.classList.remove('dark');
    localStorage.setItem('dockit_theme', 'light');
    localStorage.setItem('darkMode', 'false');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dockit:theme-changed', { detail: { isDark } }));
  }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    const handleThemeEvent = (e) => {
      if (typeof e.detail?.isDark === 'boolean') {
        setIsDark(e.detail.isDark);
      }
    };
    window.addEventListener('dockit:theme-changed', handleThemeEvent);
    return () => window.removeEventListener('dockit:theme-changed', handleThemeEvent);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((mode) => {
    const dark = mode === 'dark';
    setIsDark(dark);
    applyTheme(dark);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, theme: isDark ? 'dark' : 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  const [localDark, setLocalDark] = useState(getInitialTheme);

  useEffect(() => {
    const handleThemeEvent = (e) => {
      if (typeof e.detail?.isDark === 'boolean') {
        setLocalDark(e.detail.isDark);
      }
    };
    window.addEventListener('dockit:theme-changed', handleThemeEvent);
    return () => window.removeEventListener('dockit:theme-changed', handleThemeEvent);
  }, []);

  if (context) return context;

  // Bulletproof fallback that works identically even outside ThemeProvider
  return {
    isDark: localDark,
    toggleTheme: () => {
      const next = !localDark;
      setLocalDark(next);
      applyTheme(next);
    },
    setTheme: (mode) => {
      const dark = mode === 'dark';
      setLocalDark(dark);
      applyTheme(dark);
    },
    theme: localDark ? 'dark' : 'light',
  };
}
