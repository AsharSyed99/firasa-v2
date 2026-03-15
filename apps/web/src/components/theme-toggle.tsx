'use client';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-xl"
      title={`Current: ${theme} mode`}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
