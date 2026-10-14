'use client';

import * as React from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface UseThemeProps {
  themes: string[];
  forcedTheme?: string;
  setTheme: (theme: string) => void;
  theme?: string;
  resolvedTheme?: 'light' | 'dark';
  systemTheme?: 'light' | 'dark';
}

export interface ThemeProviderProps {
  children?: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
  attribute?: string | string[];
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  forcedTheme?: string;
  disableTransitionOnChange?: boolean;
  themes?: string[];
  value?: { [themeName: string]: string };
  nonce?: string;
}

const ThemeContext = React.createContext<UseThemeProps>({
  themes: ['light', 'dark', 'system'],
  setTheme: () => {},
  theme: 'system',
  resolvedTheme: 'light',
  systemTheme: 'light',
});

export const useTheme = () => React.useContext(ThemeContext);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  attribute = 'class',
  enableSystem = true,
  enableColorScheme = true,
  forcedTheme,
  themes = ['light', 'dark', 'system'],
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(storageKey) || defaultTheme;
      } catch {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== theme) {
        setThemeState(stored);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      setSystemTheme(media.matches ? 'dark' : 'light');
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const effectiveTheme = forcedTheme || theme;
  const resolvedTheme: 'light' | 'dark' =
    effectiveTheme === 'system' && enableSystem
      ? systemTheme
      : effectiveTheme === 'dark'
      ? 'dark'
      : 'light';

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const attrs = Array.isArray(attribute) ? attribute : [attribute];

    attrs.forEach((attr) => {
      if (attr === 'class') {
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedTheme);
      } else {
        root.setAttribute(attr, resolvedTheme);
      }
    });

    if (enableColorScheme) {
      root.style.colorScheme = resolvedTheme;
    }
  }, [resolvedTheme, attribute, enableColorScheme]);

  const setTheme = React.useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore localStorage errors
      }
    },
    [storageKey]
  );

  const value = React.useMemo<UseThemeProps>(
    () => ({
      theme: effectiveTheme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      themes,
      systemTheme,
    }),
    [effectiveTheme, setTheme, forcedTheme, resolvedTheme, themes, systemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
