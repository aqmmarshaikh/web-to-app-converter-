import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Global request logging middleware.
 * Measures response time and logs request details (headers, body, user, request ID).
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  (req as any).startTime = start;
  const requestId = (req as any).requestId || req.headers['x-request-id'] || 'N/A';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as any).userId || 'Anonymous';

    logger.info(`[API REQUEST] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Time: ${duration}ms - User: ${userId} - Request ID: ${requestId}`);

    // Detailed server console log for traceability
    console.log(`[API REQUEST LOG]
Request ID: ${requestId}
Method: ${req.method}
URL: ${req.originalUrl}
User ID: ${userId}
Response Time: ${duration}ms
Status Code: ${res.statusCode}
Headers: ${JSON.stringify(req.headers, null, 2)}
Body: ${JSON.stringify(req.body, null, 2)}
`);
  });

  next();
};
