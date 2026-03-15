import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  alertThreshold: z.number().int().min(0).max(100).optional(),
  maxAlertsPerDay: z.number().int().min(1).max(100).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  timezone: z.string().min(1).optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappNumber: z.string().nullable().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailDigestTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  tickerWhitelist: z.array(z.string()).optional(),
  tickerBlacklist: z.array(z.string()).optional(),
});

export const updateGuruConfigSchema = z.object({
  isFollowing: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  customWeight: z.number().min(0).max(2).nullable().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateGuruConfigInput = z.infer<typeof updateGuruConfigSchema>;
