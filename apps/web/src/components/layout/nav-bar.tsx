'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBar } from '../search/search-bar';
import { Radio, Brain, Target, Trophy, Settings, type LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Signals', Icon: Radio },
  { href: '/gurus', label: 'Gurus', Icon: Brain },
  { href: '/convergence', label: 'Converge', Icon: Target },
  { href: '/leaderboard', label: 'Ranks', Icon: Trophy },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 safe-area-bottom z-50"
      style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <item.Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <div className="flex flex-col items-center gap-0.5 py-2 px-3">
          <SearchBar />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>Search</span>
        </div>
      </div>
    </nav>
  );
}
