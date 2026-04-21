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

  // CORS — supports comma-separated origins and Vercel preview URLs
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      // Exact match
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Vercel preview URL pattern
      if (allowedOrigins.some((o) => o.includes('.vercel.app')) && origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  }));

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
