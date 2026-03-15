import { Router } from 'express';
import { guruRouter } from './gurus.js';
import { meRouter } from './me.js';
import { signalRouter } from './signals.js';
import { adminOpsRouter } from './pipeline.js';
import { flagRouter } from './flags.js';
import { adminJobsRouter } from './scheduler.js';
import { billingRouter } from './billing.js';
import { adminRouter } from './admin.js';

export const v1Router = Router();

v1Router.get('/', (_req, res) => {
  res.json({ api: 'firasa', version: 'v1' });
});

v1Router.use('/gurus', guruRouter);
v1Router.use('/me', meRouter);
v1Router.use('/signals', signalRouter);
v1Router.use('/admin', adminOpsRouter);
v1Router.use('/admin/jobs', adminJobsRouter);
v1Router.use('/flags', flagRouter);
v1Router.use('/billing', billingRouter);
v1Router.use('/admin/monitor', adminRouter);
