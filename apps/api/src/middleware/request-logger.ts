import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../config/logger.js';

const log = createLogger('http');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    log[level]({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: (req as any).user?.id,
    }, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}
