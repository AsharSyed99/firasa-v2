import { Router } from 'express';

export const v1Router = Router();

// Placeholder — routes added in subsequent commits
v1Router.get('/', (_req, res) => {
  res.json({ api: 'firasa', version: 'v1' });
});
