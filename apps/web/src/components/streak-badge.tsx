'use client';

import { useEffect, useState } from 'react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (streak > 0) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  if (streak <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-semibold transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.5)',
        color: streak >= 5 ? '#f97316' : '#fbbf24',
      }}
    >
      🔥 {streak}
    </span>
  );
}
