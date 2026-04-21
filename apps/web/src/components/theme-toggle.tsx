'use client';
import { useTheme, THEMES, THEME_META } from '@/hooks/use-theme';
import { Palette } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${THEME_META[next].label} theme`}
      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
      title={`Theme: ${THEME_META[theme].label}`}
    >
      <Palette size={18} className="text-[var(--accent)]" />
    </button>
  );
}
