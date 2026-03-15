import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import * as searchService from '../../services/search.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { SearchResults } from '../../services/search.service.js';

export const searchRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required').max(50, 'Query too long'),
  type: z.enum(['all', 'signals', 'gurus', 'tickers']).default('all'),
});

/** GET /api/v1/search?q=NVDA&type=all — Global search */
searchRouter.get(
  '/',
  requireAuth,
  validateQuery(searchQuerySchema),
  async (req, res) => {
    const { q, type } = (req as unknown as { validatedQuery: z.infer<typeof searchQuerySchema> }).validatedQuery;

    const typeFilter = type === 'all' ? undefined : type;
    const results = await searchService.search(q, typeFilter);

    const response: ApiResponse<SearchResults> = { success: true, data: results };
    res.json(response);
  }
);
