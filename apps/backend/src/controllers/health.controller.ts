import { Request, Response } from 'express';
import { getApps } from 'firebase-admin/app';
import { db } from '../config/firebase-admin';
import { redis } from '../config/redis';
import { buildQueue } from './build.controller';
import { isRedisAvailable } from '../utils/redis-check';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Helper to retrieve unified queue and connection status.
 */
const getUnifiedStatus = async () => {
  let redisConnected = false;
  let queueActive = false;
  let workerActive = false;
  let waiting = 0;
  let active = 0;
  let completed = 0;
  let failed = 0;
  let delayed = 0;
  let latestJob = null;
  let latestError: string | null = null;
  
  let latestJobId = null;
  let latestJobStatus = null;
  let latestJobProgress = null;
  let latestJobError = null;

  try {
    redisConnected = isRedisAvailable;
  } catch (err: any) {
    latestError = err.message;
  }

  if (redisConnected) {
    try {
      queueActive = true;
      [waiting, active, completed, failed, delayed] = await Promise.all([
        buildQueue.getWaitingCount(),
        buildQueue.getActiveCount(),
        buildQueue.getCompletedCount(),
        buildQueue.getFailedCount(),
        buildQueue.getDelayedCount(),
      ]);

      const heartbeat = await redis.get('worker:heartbeat');
      if (heartbeat) {
        const diff = Date.now() - parseInt(heartbeat, 10);
        workerActive = diff < 15000; // Active if updated within last 15s
      }

      const jobs = await buildQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 0, 10, false);
      if (jobs && jobs.length > 0) {
        jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const job = jobs[0];
        const state = await job.getState();
        
        latestJobId = job.id || null;
        latestJobStatus = state;
        latestJobProgress = job.progress ?? null;
        latestJobError = job.failedReason || null;

        latestJob = {
          id: latestJobId,
          status: latestJobStatus,
          progress: latestJobProgress,
          error: latestJobError,
        };

        if (latestJobError) {
          latestError = latestJobError;
        }
      }
    } catch (err: any) {
      queueActive = false;
      latestError = err.message;
    }
  }

  return {
    redis: redisConnected,
    queue: queueActive,
    worker: workerActive,
    waiting,
    active,
    completed,
    failed,
    delayed,
    latestJob,
    latestError,
    latestJobId,
    latestJobStatus,
    latestJobProgress,
    latestJobError,
  };
};

/**
 * GET /health
 * Performs check on all dependencies and returns unified payload.
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getUnifiedStatus();
    
    // Check firebase/db status as well for health check
    let firebaseOk = false;
    let databaseOk = false;
    try {
      firebaseOk = getApps().length > 0;
      await db.collection('users').limit(1).get();
      databaseOk = true;
    } catch (dbErr) {
      logger.error('Health check failed to query Firestore:', dbErr);
    }

    const isHealthy = status.redis && status.queue && status.worker && firebaseOk && databaseOk;
    
    res.status(isHealthy ? 200 : 503).json(status);
  } catch (error: any) {
    logger.error('Error in getHealth endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /debug
 * Returns configuration checklist status for environment variables, Redis, Firebase, and BullMQ.
 */
export const getDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getUnifiedStatus();
    
    let firebaseInitialized = false;
    let firebaseQueryable = false;
    let firebaseError = null;

    try {
      firebaseInitialized = getApps().length > 0;
      await db.collection('users').limit(1).get();
      firebaseQueryable = true;
    } catch (err: any) {
      firebaseError = err.message || err;
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: env.NODE_ENV,
        PORT: env.PORT,
        FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID ? 'Configured' : 'Missing',
        FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET ? 'Configured' : 'Missing',
        FIREBASE_SERVICE_ACCOUNT_PATH: env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'Configured' : 'Bypassed (Local fallback)',
        REDIS_URL: env.REDIS_URL ? 'Configured' : 'Defaulting',
      },
      firebase: {
        initialized: firebaseInitialized,
        databaseQueryable: firebaseQueryable,
        error: firebaseError,
      },
      ...status
    };

    res.json(debugInfo);
  } catch (error: any) {
    logger.error('Error in getDebug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /queue/debug
 * Returns detailed BullMQ queue status.
 */
export const getQueueDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getUnifiedStatus();
    res.json(status);
  } catch (error: any) {
    logger.error('Error in getQueueDebug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
