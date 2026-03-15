/** User subscription tiers */
export type UserTier = 'free' | 'pro' | 'premium' | 'admin';

/** Signal actions from LLM analysis */
export type SignalAction = 'BUY' | 'SELL' | 'HOLD' | 'UNCLEAR';

/** Signal sentiment from LLM analysis */
export type SignalSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';

/** Outcome result for a timeframe */
export type OutcomeResult = 'WIN' | 'LOSS' | 'NEUTRAL';

/** Alert delivery channels */
export type AlertChannel = 'whatsapp' | 'push' | 'email';

/** Alert delivery status */
export type AlertStatus = 'sent' | 'delivered' | 'failed';

/** Guru categories */
export type GuruCategory = 'stocks' | 'options' | 'crypto' | 'macro' | 'general';

/** Device platforms for push notifications */
export type DevicePlatform = 'ios' | 'android' | 'web';

/** Outcome timeframes */
export const TIMEFRAMES = ['1h', '4h', '1d', '3d', '1w', '1m'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
