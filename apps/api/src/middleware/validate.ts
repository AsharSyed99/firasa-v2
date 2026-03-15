import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Validate request body against a Zod schema.
 * Returns 400 with structured errors on failure.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formatZodErrors(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: formatZodErrors(result.error),
      });
      return;
    }
    // Attach validated query
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}

/** Common pagination schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    formatted[issue.path.join('.')] = issue.message;
  }
  return formatted;
}
