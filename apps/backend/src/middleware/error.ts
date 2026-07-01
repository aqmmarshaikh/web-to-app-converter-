import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns a standardized error response,
 * logging detailed context including request ID, user, headers, body, and response time.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const startTime = (req as any).startTime || Date.now();
  const duration = Date.now() - startTime;
  const requestId = (req as any).requestId || req.headers['x-request-id'] || 'N/A';
  const userId = (req as any).userId || 'Anonymous';

  // Server console logging with complete details
  console.error(`[API ERROR LOG]
Request ID: ${requestId}
Method: ${req.method}
URL: ${req.originalUrl}
User ID: ${userId}
Response Time: ${duration}ms
Headers: ${JSON.stringify(req.headers, null, 2)}
Body: ${JSON.stringify(req.body, null, 2)}
Error Stack: ${err.stack || err}
`);

  logger.error(`[API ERROR] ${req.method} ${req.originalUrl} - Error: ${err.message} - Time: ${duration}ms - Request ID: ${requestId}`, err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
};

/**
 * 404 handler for unmatched routes.
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};
