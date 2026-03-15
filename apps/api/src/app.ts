import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getEnv } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { v1Router } from './routes/v1/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';

export function createApp() {
  const app = express();
  const env = getEnv();

  // Security
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  // Parsing
  app.use(express.json({ limit: '1mb' }));

  // Logging
  app.use(requestLogger);

  // Routes
  app.use('/health', healthRouter);
  app.use('/api/v1', v1Router);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
