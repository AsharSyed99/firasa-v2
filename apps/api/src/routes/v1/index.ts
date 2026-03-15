import { Router } from 'express';
import { guruRouter } from './gurus.js';
import { meRouter } from './me.js';
import { signalRouter } from './signals.js';
import { pipelineRouter } from './pipeline.js';

export const v1Router = Router();

v1Router.get('/', (_req, res) => {
  res.json({ api: 'firasa', version: 'v1' });
});

v1Router.use('/gurus', guruRouter);
v1Router.use('/me', meRouter);
v1Router.use('/signals', signalRouter);
v1Router.use('/pipeline', pipelineRouter);
