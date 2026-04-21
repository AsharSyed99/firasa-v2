'use client';

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number): string {
  if (score >= 70) return '#34d399'; // emerald-400
  if (score >= 40) return '#fbbf24'; // amber-400
  return '#6b7280'; // gray-500
}

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 44 44" className="-rotate-90">
        <circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-800"
        />
        <circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute text-[11px] font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
