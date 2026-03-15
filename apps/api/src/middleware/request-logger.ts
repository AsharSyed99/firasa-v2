import type { Request, Response, NextFunction } from 'express';

/** Log request method, path, status, and duration */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    const msg = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

    if (level === 'warn') {
      console.warn(msg);
    } else if (process.env.LOG_LEVEL === 'debug') {
      console.log(msg);
    }
  });

  next();
}
