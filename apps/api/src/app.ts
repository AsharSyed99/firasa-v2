import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getEnv } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { v1Router } from './routes/v1/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { errorTracker, performanceTracker } from './middleware/sentry.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiLimiter, perUserLimiter } from './middleware/rate-limit.js';
import { antiAbuse } from './middleware/anti-abuse.js';
import { enforceDailyApiLimit } from './middleware/tier-enforcement.js';

export function createApp() {
  const app = express();
  const env = getEnv();

  // Security
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  // Parsing
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting (IP-based first pass)
  app.use('/api/', apiLimiter);

  // Logging
  app.use(requestLogger);

  // Performance tracking
  app.use(performanceTracker);

  // Routes (health is public, no auth needed)
  app.use('/health', healthRouter);

  // Per-user rate limit + anti-abuse + daily quota (after auth resolves in route handlers)
  app.use('/api/', perUserLimiter);
  app.use('/api/', antiAbuse);
  app.use('/api/', enforceDailyApiLimit);

  app.use('/api/v1', v1Router);

  // Error tracking (before handler so errors are captured)
  app.use(errorTracker);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
