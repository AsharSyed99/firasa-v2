'use client';

import type { SignalDto } from '@firasa/shared';
import { ScoreRing } from './score-ring';
import { TrendingUp, TrendingDown, Minus, HelpCircle, Clock, ChevronRight, Moon } from 'lucide-react';

/* ─── Helpers ───────────────────────────────────────────────── */

/** Strip "[Quote Tweet]" prefix the pipeline prepends to reasoning */
function cleanText(text: string): string {
  return text.replace(/^\[Quote Tweet\]\s*/i, '').trim();
}

/** Extract t.co link from tweet text (quote tweets end with the quoted URL) */
function extractQuoteLink(text: string): { body: string; link: string | null } {
  const match = text.match(/\s*(https:\/\/t\.co\/\S+)\s*$/);
  if (!match) return { body: text, link: null };
  return { body: text.slice(0, match.index).trim(), link: match[1] };
}

/** Format confidence (0-1 float) to integer percentage */
function fmtConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Style config ──────────────────────────────────────────── */

const ACTION_STYLE: Record<string, {
  accent: string; glow: string; pill: string; Icon: typeof TrendingUp;
}> = {
  BUY: {
    accent: 'bg-emerald-500',
    glow: 'shadow-emerald-500/8 hover:shadow-emerald-500/15',
    pill: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25',
    Icon: TrendingUp,
  },
  SELL: {
    accent: 'bg-rose-500',
    glow: 'shadow-rose-500/8 hover:shadow-rose-500/15',
    pill: 'bg-rose-500/15 text-rose-400 ring-rose-500/25',
    Icon: TrendingDown,
  },
  HOLD: {
    accent: 'bg-amber-500',
    glow: 'shadow-amber-500/8 hover:shadow-amber-500/15',
    pill: 'bg-amber-500/15 text-amber-400 ring-amber-500/25',
    Icon: Minus,
  },
  UNCLEAR: {
    accent: 'bg-gray-600',
    glow: 'shadow-gray-500/5 hover:shadow-gray-500/8',
    pill: 'bg-gray-500/15 text-gray-400 ring-gray-500/25',
    Icon: HelpCircle,
  },
};

/* ─── Card ──────────────────────────────────────────────────── */

interface Props {
  signal: SignalDto;
  onSelect: (signal: SignalDto) => void;
}

export function SignalCard({ signal, onSelect }: Props) {
  const style = ACTION_STYLE[signal.action] ?? ACTION_STYLE.UNCLEAR;
  const { Icon } = style;
  const initials = signal.guruName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const isQuote = signal.reasoning?.startsWith('[Quote Tweet]');
  const tweet = extractQuoteLink(cleanText(signal.tweetText));

  return (
    <button
      onClick={() => onSelect(signal)}
      className="group relative w-full text-left rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ease-out"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${style.accent}`} />

      <div className="pl-4 pr-4 py-3.5">
        {/* ─── Row 1: Guru + Action + Score ────────── */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {signal.guruName}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>@{signal.guruHandle}</span>
            </div>
          </div>

          {/* Action pill */}
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 shrink-0 ${style.pill}`}>
            <Icon size={11} />
            {signal.action}
          </span>

          <ScoreRing score={signal.score} size={36} />
        </div>

        {/* ─── Row 2: Tickers + meta ─────────────────── */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {signal.tickers.map((t) => (
            <span
              key={t}
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              ${t}
            </span>
          ))}
          {signal.entryPrice != null && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@ ${signal.entryPrice.toFixed(2)}</span>
          )}
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-faint)' }}>
            {fmtConfidence(signal.confidence)} conf
          </span>
          {signal.afterHours && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-violet-900/40 text-violet-300 rounded-md">
              <Moon size={9} />
              AH
            </span>
          )}
        </div>

        {/* ─── Row 3: Tweet text ──────────────────────── */}
        {isQuote && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              Quote Tweet
            </span>
          </div>
        )}
        <p className="text-[13px] leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
          {tweet.body}
        </p>
        {isQuote && tweet.link && (
          <div
            className="rounded-lg px-2.5 py-1.5 mb-2 text-[11px] truncate"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}
          >
            🔗 Quoted post
          </div>
        )}

        {/* ─── Row 4: Footer ─────────────────────────── */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
            <Clock size={11} />
            {relativeTime(signal.tweetCreatedAt)}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] transition-colors" style={{ color: 'var(--text-faint)' }}>
            Details
            <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}
