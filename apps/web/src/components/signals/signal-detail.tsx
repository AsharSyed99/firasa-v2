'use client';

import { useEffect, useState } from 'react';
import type { SignalDto, SignalDetailDto } from '@firasa/shared';
import { api } from '@/lib/api';
import { ScoreRing } from './score-ring';
import { OutcomeTimeline } from './outcome-timeline';
import { ShareButton } from './share-button';
import {
  X, TrendingUp, TrendingDown, Minus, HelpCircle,
  ExternalLink, BarChart3, Brain, Image as ImageIcon,
  Moon, Shield, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ─── Config ──────────────────────────────────────────────────── */

const ACTION_CFG: Record<string, {
  gradient: string; Icon: typeof TrendingUp;
}> = {
  BUY:     { gradient: 'from-emerald-500/20 to-emerald-900/5', Icon: TrendingUp },
  SELL:    { gradient: 'from-rose-500/20 to-rose-900/5', Icon: TrendingDown },
  HOLD:    { gradient: 'from-amber-500/20 to-amber-900/5', Icon: Minus },
  UNCLEAR: { gradient: 'from-gray-500/20 to-gray-900/5', Icon: HelpCircle },
};

const SENTIMENT_STYLE: Record<string, string> = {
  BULLISH: 'text-emerald-400 bg-emerald-950/50',
  BEARISH: 'text-rose-400 bg-rose-950/50',
  NEUTRAL: 'text-gray-400 bg-gray-800/50',
  MIXED: 'text-amber-400 bg-amber-950/50',
};

const PILL_STYLE: Record<string, string> = {
  BUY: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  SELL: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
  HOLD: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  UNCLEAR: 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
};

/* ─── Helpers ─────────────────────────────────────────────────── */

function cleanReasoning(text: string): { isQuote: boolean; clean: string } {
  const isQuote = text.startsWith('[Quote Tweet]');
  return { isQuote, clean: text.replace(/^\[Quote Tweet\]\s*/i, '').trim() };
}

/** Extract t.co link from tweet text (quote tweets end with the quoted URL) */
function extractQuoteLink(text: string): { body: string; link: string | null } {
  const match = text.match(/\s*(https:\/\/t\.co\/\S+)\s*$/);
  if (!match) return { body: text, link: null };
  return { body: text.slice(0, match.index).trim(), link: match[1] };
}

function fmtConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

const TWEET_COLLAPSE_THRESHOLD = 200;

/* ─── Component ───────────────────────────────────────────────── */

interface Props {
  signal: SignalDto;
  onClose: () => void;
}

export function SignalDetail({ signal, onClose }: Props) {
  const [detail, setDetail] = useState<SignalDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tweetExpanded, setTweetExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getSignalDetail(signal.id)
      .then((res) => { if (!cancelled) setDetail(res.data ?? null); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [signal.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const cfg = ACTION_CFG[signal.action] ?? ACTION_CFG.UNCLEAR;
  const { Icon: ActionIcon } = cfg;
  const pillCls = PILL_STYLE[signal.action] ?? PILL_STYLE.UNCLEAR;
  const sentimentCls = SENTIMENT_STYLE[signal.sentiment] ?? SENTIMENT_STYLE.NEUTRAL;
  const time = new Date(signal.tweetCreatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const initials = signal.guruName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const tweetIsLong = signal.tweetText.length > TWEET_COLLAPSE_THRESHOLD;
  const reasoning = signal.reasoning ? cleanReasoning(signal.reasoning) : null;
  const tweet = extractQuoteLink(signal.tweetText);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Signal detail for ${signal.tickers.join(', ')}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition z-10"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="p-5 space-y-4">

          {/* ═══════════════════════════════════════════════
              HEADER — Action + Guru + Score
             ═══════════════════════════════════════════════ */}
          <div className={`bg-gradient-to-br ${cfg.gradient} rounded-xl p-4`}>
            {/* Top row: action pill + score */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                {/* Action + Guru */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${pillCls}`}>
                    <ActionIcon size={13} />
                    {signal.action}
                  </span>
                </div>

                {/* Guru info */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{signal.guruName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{signal.guruHandle}</p>
                  </div>
                </div>

                {/* Tickers */}
                <div className="flex flex-wrap gap-1.5">
                  {signal.tickers.map((t) => (
                    <span
                      key={t}
                      className="text-sm font-mono font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      ${t}
                    </span>
                  ))}
                  {signal.entryPrice != null && (
                    <span className="text-sm self-center ml-1" style={{ color: 'var(--text-muted)' }}>
                      @ ${signal.entryPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <ScoreRing score={signal.score} size={60} />
            </div>

            {/* Meta pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sentimentCls}`}>
                {signal.sentiment}
              </span>
              <MetaPill icon={<Shield size={10} />} label={`${fmtConfidence(signal.confidence)} confidence`} />
              {signal.afterHours && (
                <MetaPill icon={<Moon size={10} />} label="After Hours" className="bg-violet-900/40 text-violet-300" />
              )}
              <span className="text-[11px] ml-auto" style={{ color: 'var(--text-faint)' }}>{time}</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              TWEET — full text with expand/collapse
             ═══════════════════════════════════════════════ */}
          <DetailSection icon={<ExternalLink size={14} />} title="Original Tweet">
            {reasoning?.isQuote && (
              <span
                className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-2"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                Quote Tweet — guru commentary on another post
              </span>
            )}

            <div
              className="rounded-xl p-3.5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap ${!tweetExpanded && tweetIsLong ? 'line-clamp-4' : ''}`}
                style={{ color: 'var(--text-secondary)' }}
              >
                {tweet.body}
              </p>

              {tweetIsLong && (
                <button
                  onClick={(e) => { e.stopPropagation(); setTweetExpanded(!tweetExpanded); }}
                  className="flex items-center gap-1 mt-2 text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  {tweetExpanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Read full tweet</>}
                </button>
              )}
            </div>

            {/* Embedded quoted post card */}
            {reasoning?.isQuote && tweet.link && (
              <a
                href={tweet.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-3 mt-2 transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                    <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Quoted Post</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Tap to view on X</p>
                  </div>
                </div>
              </a>
            )}

            <a
              href={`https://twitter.com/i/status/${signal.tweetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={11} />
              View on X
            </a>
          </DetailSection>

          {/* ═══════════════════════════════════════════════
              OUTCOMES
             ═══════════════════════════════════════════════ */}
          <DetailSection icon={<BarChart3 size={14} />} title="Outcome Tracker">
            {loading ? (
              <div className="flex gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[52px] h-12 rounded animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                ))}
              </div>
            ) : detail?.outcomes?.length ? (
              <OutcomeTimeline outcomes={detail.outcomes} />
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-faint)' }}>
                Outcomes are tracked after the signal is published — check back later
              </p>
            )}
          </DetailSection>

          {/* ═══════════════════════════════════════════════
              AI REASONING
             ═══════════════════════════════════════════════ */}
          {reasoning && (
            <DetailSection icon={<Brain size={14} />} title="AI Reasoning">
              <div
                className="rounded-xl p-3.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {reasoning.clean}
                </p>
              </div>
            </DetailSection>
          )}

          {/* ═══════════════════════════════════════════════
              IMAGE / CHART ANALYSIS
             ═══════════════════════════════════════════════ */}
          {detail?.imageAnalysis && (
            <DetailSection icon={<ImageIcon size={14} />} title="Chart Analysis">
              <div
                className="rounded-xl p-3.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {detail.imageAnalysis}
                </p>
              </div>
            </DetailSection>
          )}

          {/* ═══════════════════════════════════════════════
              ACTIONS BAR
             ═══════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 pt-2 pb-1">
            <ShareButton signal={signal} />
            <a
              href={`https://twitter.com/i/status/${signal.tweetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              Open on X
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetaPill({ icon, label, className }: { icon: React.ReactNode; label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${className ?? ''}`}
      style={!className ? { background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : undefined}
    >
      {icon}
      {label}
    </span>
  );
}
