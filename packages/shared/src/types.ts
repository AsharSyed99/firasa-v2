import type {
  UserTier,
  SignalAction,
  SignalSentiment,
  OutcomeResult,
  AlertChannel,
  GuruCategory,
  Timeframe,
} from './enums.js';

// ─── API Response Wrapper ────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    cursor?: string;
  };
}

// ─── User ────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  tier: UserTier;
  onboardingDone: boolean;
  createdAt: string;
}

export interface UserPreferenceDto {
  alertThreshold: number;
  maxAlertsPerDay: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  whatsappEnabled: boolean;
  whatsappNumber: string | null;
  pushEnabled: boolean;
  emailEnabled: boolean;
  emailDigestTime: string | null;
  tickerWhitelist: string[];
  tickerBlacklist: string[];
}

// ─── Guru ────────────────────────────────────────────────────

export interface GuruDto {
  id: string;
  twitterHandle: string;
  displayName: string;
  category: GuruCategory;
  reliability: number;
  isActive: boolean;
  totalSignals: number;
  profitableSignals: number;
  avgScore: number;
  lastPolledAt: string | null;
  winRates: TimeframeWinRate[];
}

export interface TimeframeWinRate {
  timeframe: Timeframe;
  wins: number;
  losses: number;
  neutral: number;
  total: number;
  winRate: number;
}

export interface UserGuruConfigDto {
  guruId: string;
  isFollowing: boolean;
  isMuted: boolean;
  customWeight: number | null;
}

// ─── Signal ──────────────────────────────────────────────────

export interface SignalDto {
  id: string;
  guruId: string;
  guruHandle: string;
  guruName: string;
  tweetId: string;
  tweetText: string;
  tweetCreatedAt: string;
  tickers: string[];
  action: SignalAction;
  sentiment: SignalSentiment;
  confidence: number;
  score: number;
  reasoning: string | null;
  entryPrice: number | null;
  afterHours: boolean;
  createdAt: string;
}

export interface SignalDetailDto extends SignalDto {
  imageAnalysis: string | null;
  outcomes: SignalOutcomeDto[];
}

export interface SignalOutcomeDto {
  timeframe: Timeframe;
  price: number | null;
  outcome: OutcomeResult | null;
  changePercent: number | null;
}

// ─── Trade Tracker ───────────────────────────────────────────

export interface TradeOutcomeDto {
  signal: SignalDto;
  currentPrice: number | null;
  currentAfterHours: boolean;
  changePercent: number | null;
  outcomes: SignalOutcomeDto[];
}

// ─── Alert ───────────────────────────────────────────────────

export interface AlertLogDto {
  id: string;
  signalId: string;
  channel: AlertChannel;
  status: string;
  sentAt: string;
}

// ─── Feature Flags ───────────────────────────────────────────

export interface FeatureFlagDto {
  name: string;
  enabled: boolean;
  rolloutPercent: number;
}

// ─── Daily Summary ───────────────────────────────────────────

export interface DailySummaryDto {
  date: string;
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  avgScore: number;
  alertsSent: number;
  activeUsers: number;
  newUsers: number;
}

// ─── Health ──────────────────────────────────────────────────

export interface HealthDto {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  database: boolean;
  timestamp: string;
}
