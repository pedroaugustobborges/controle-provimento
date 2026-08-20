import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'dashboard-theme';
const THEME_EVENT = 'gdp-theme-change';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Listen for changes broadcast from other useTheme instances in the same tab
  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<{ theme: Theme }>).detail?.theme;
      if (next === 'dark' || next === 'light') setTheme(next);
    };
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      // Broadcast to all other useTheme instances in this tab
      window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: next } }));
      return next;
    });
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
