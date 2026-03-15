import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { generateDailyMood } from '../../services/market-mood.service.js';
import type { MarketMood } from '../../services/market-mood.service.js';

export const moodRouter = Router();

/** GET /api/v1/mood — Get current market mood */
moodRouter.get('/', requireAuth, async (_req, res) => {
  try {
    const mood = await generateDailyMood();
    const response: { success: true; data: MarketMood } = {
      success: true,
      data: mood,
    };
    res.json(response);
  } catch (err) {
    console.error('Market mood generation failed:', err);
    res.status(500).json({ success: false, error: 'Failed to generate market mood' });
  }
});
