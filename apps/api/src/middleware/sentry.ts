import type { Request, Response, NextFunction } from 'express';

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  method: string;
  userId?: string;
  statusCode: number;
  timestamp: string;
  userAgent?: string;
}

// In-memory error log (for when Sentry DSN is not configured)
const recentErrors: ErrorReport[] = [];
const MAX_RECENT_ERRORS = 100;

/** Report an error to Sentry or local buffer */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  const sentryDsn = process.env.SENTRY_DSN;

  if (sentryDsn) {
    // In production, this would use @sentry/node
    console.error('[SENTRY]', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  // Always keep local buffer
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    url: (context?.url as string) ?? 'unknown',
    method: (context?.method as string) ?? 'unknown',
    userId: context?.userId as string | undefined,
    statusCode: (context?.statusCode as number) ?? 500,
    timestamp: new Date().toISOString(),
    userAgent: context?.userAgent as string | undefined,
  };

  recentErrors.unshift(report);
  if (recentErrors.length > MAX_RECENT_ERRORS) {
    recentErrors.length = MAX_RECENT_ERRORS;
  }
}

/** Express error tracking middleware — place BEFORE error handler */
export function errorTracker(err: Error & { statusCode?: number }, req: Request, _res: Response, next: NextFunction): void {
  const statusCode = (err as any).statusCode ?? 500;

  // Only track server errors (5xx) and unexpected 4xx
  if (statusCode >= 500 || statusCode === 400) {
    captureError(err, {
      url: req.originalUrl,
      method: req.method,
      userId: (req as any).user?.id,
      statusCode,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
  }

  next(err);
}

/** Get recent errors (admin endpoint) */
export function getRecentErrors(): ErrorReport[] {
  return [...recentErrors];
}

/** Request performance tracking middleware */
export function performanceTracker(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const threshold = 1000; // 1 second

    if (durationMs > threshold) {
      console.warn(`[PERF] Slow request: ${req.method} ${req.originalUrl} took ${durationMs.toFixed(0)}ms`);
    }
  });

  next();
}
