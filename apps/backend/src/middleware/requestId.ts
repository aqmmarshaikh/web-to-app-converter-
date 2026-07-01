import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestStorage } from '../utils/context';

export interface ExtendedRequest extends Request {
  id?: string;
  userId?: string;
}

/**
 * Middleware to append a unique request ID to the request/response,
 * and track it inside the async storage context.
 */
export const requestIdMiddleware = (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Set response header
  res.setHeader('X-Request-Id', requestId);
  req.id = requestId;

  // Run downstream handlers inside the context
  requestStorage.run({ requestId, userId: req.userId }, () => {
    next();
  });
};
