import { Router } from 'express';
import type { HealthDto } from '@firasa/shared';
import { getDb } from '../services/database.js';

const startTime = Date.now();

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let dbOk = false;
  try {
    await getDb().$queryRawUnsafe('SELECT 1');
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const health: HealthDto = {
    status: dbOk ? 'ok' : 'degraded',
    version: '2.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbOk,
    timestamp: new Date().toISOString(),
  };

  res.status(dbOk ? 200 : 503).json(health);
});
