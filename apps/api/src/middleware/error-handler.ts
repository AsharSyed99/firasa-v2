import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/** Global error handler — sanitized for users, detailed in server logs */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode ?? 500;

  // Always log full details server-side
  console.error(`[ERROR] ${statusCode}: ${err.message}`, err.stack);

  // User sees generic message for 5xx, specific message for 4xx
  const message = statusCode >= 500
    ? 'Something went wrong. Please try again later.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
