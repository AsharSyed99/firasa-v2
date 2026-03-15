import { Router } from 'express';
import { guruRouter } from './gurus.js';

export const v1Router = Router();

v1Router.get('/', (_req, res) => {
  res.json({ api: 'firasa', version: 'v1' });
});

v1Router.use('/gurus', guruRouter);
