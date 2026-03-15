/** Tier feature limits */
export const TIER_LIMITS = {
  free: {
    maxGurus: 3,
    maxAlertsPerDay: 5,
    historyDays: 7,
    whatsapp: false,
    tradeTracker: false,
    apiAccess: false,
    customScoring: false,
  },
  pro: {
    maxGurus: Infinity,
    maxAlertsPerDay: 50,
    historyDays: 90,
    whatsapp: true,
    tradeTracker: true,
    apiAccess: false,
    customScoring: false,
  },
  premium: {
    maxGurus: Infinity,
    maxAlertsPerDay: Infinity,
    historyDays: 365,
    whatsapp: true,
    tradeTracker: true,
    apiAccess: true,
    customScoring: true,
  },
  admin: {
    maxGurus: Infinity,
    maxAlertsPerDay: Infinity,
    historyDays: Infinity,
    whatsapp: true,
    tradeTracker: true,
    apiAccess: true,
    customScoring: true,
  },
} as const;

export type TierLimits = (typeof TIER_LIMITS)[keyof typeof TIER_LIMITS];
