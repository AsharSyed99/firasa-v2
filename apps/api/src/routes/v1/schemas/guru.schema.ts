import { z } from 'zod';

export const createGuruSchema = z.object({
  twitterHandle: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Invalid Twitter handle'),
  displayName: z.string().min(1).max(100),
  category: z.enum(['stocks', 'options', 'crypto', 'macro', 'general']).default('general'),
  reliability: z.number().min(0).max(1).default(0.5),
});

export const updateGuruSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  category: z.enum(['stocks', 'options', 'crypto', 'macro', 'general']).optional(),
  reliability: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
});

export type CreateGuruInput = z.infer<typeof createGuruSchema>;
export type UpdateGuruInput = z.infer<typeof updateGuruSchema>;
