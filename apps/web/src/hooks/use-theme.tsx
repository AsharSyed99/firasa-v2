'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export const THEMES = ['midnight', 'navy', 'slate', 'obsidian', 'aurora', 'ember', 'ocean', 'phantom'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<Theme, { label: string; desc: string; preview: string }> = {
  midnight: { label: 'Midnight',  desc: 'Deep dark + emerald',           preview: '#030712' },
  navy:     { label: 'Navy Gold', desc: 'Matches the Arabic logo',       preview: '#0c1425' },
  slate:    { label: 'Slate',     desc: 'Cool blue + cyan',              preview: '#0f172a' },
  obsidian: { label: 'Obsidian',  desc: 'Pure black + white',            preview: '#000000' },
  aurora:   { label: 'Aurora',    desc: 'Northern lights + violet',      preview: '#0d0b21' },
  ember:    { label: 'Ember',     desc: 'Dark charcoal + warm orange',   preview: '#1a1210' },
  ocean:    { label: 'Ocean',     desc: 'Deep sea + teal',               preview: '#071a1f' },
  phantom:  { label: 'Phantom',   desc: 'Dark gray + electric blue',     preview: '#101014' },
};

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void }

const ThemeContext = createContext<ThemeCtx>({ theme: 'midnight', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('midnight');

  useEffect(() => {
    const saved = localStorage.getItem('firasa-theme') as Theme | null;
    if (saved && THEMES.includes(saved)) setThemeState(saved);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    THEMES.forEach((t) => el.classList.remove(`theme-${t}`));
    el.classList.add(`theme-${theme}`);
    localStorage.setItem('firasa-theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
