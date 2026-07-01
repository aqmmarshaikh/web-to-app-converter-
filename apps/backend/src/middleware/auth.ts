import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase-admin';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Middleware to verify Firebase ID token.
 * Attaches userId and userRole to the request object.
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    console.log("Authorization Header:", req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const decodedToken = await auth.verifyIdToken(token);
    
    let userRole = 'USER';
    try {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = (decodedToken.role as string) || userData?.role || 'USER';
      } else {
        logger.warn(`⚠️ User doc not found in Firestore for UID: ${decodedToken.uid}.`);
      }
    } catch (dbError) {
      logger.warn('⚠️ Backend Firestore query failed. Gracefully falling back to token verification:', dbError);
    }

    req.userId = decodedToken.uid;
    req.userRole = (decodedToken.role as string) || userRole;
    next();
  } catch (error: any) {
    console.log(error); // Print the exact token verification error
    logger.error('Firebase Auth Error:', error);
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

/**
 * Middleware to check if user has admin role.
 * Must be used after authenticate middleware.
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }
  next();
};
