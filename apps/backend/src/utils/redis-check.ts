import { exec } from 'child_process';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export let isRedisAvailable = false;

const execPromise = (cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout || stderr);
    });
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verifies Redis connectivity, attempting to auto-start Redis via Docker
 * if the connection fails initially.
 */
export async function verifyAndAutoStartRedis(): Promise<boolean> {
  const url = env.REDIS_URL || 'redis://localhost:6379';
  logger.info(`🔍 Checking Redis connectivity on ${url}...`);

  let tempClient: Redis | null = null;
  try {
    tempClient = new Redis(url, {
      maxRetriesPerRequest: 0,
      connectTimeout: 1500,
      retryStrategy: () => null, // don't retry
    });

    await tempClient.ping();
    isRedisAvailable = true;
    logger.info('✅ Redis is running and reachable.');
    tempClient.disconnect();
    return true;
  } catch (err: any) {
    if (tempClient) tempClient.disconnect();
    logger.warn('⚠️ Redis is unreachable. Attempting to auto-start Redis in Docker...');

    try {
      logger.info('Running "docker start appforge-redis" to resume existing container...');
      await execPromise('docker start appforge-redis');
      logger.info('Container started successfully. Waiting for initialization...');
      await delay(2500);
    } catch (startErr: any) {
      logger.warn('Could not start existing container. Running new Redis instance...');
      try {
        await execPromise('docker run -d -p 6379:6379 --name appforge-redis redis:7-alpine');
        logger.info('New Redis container spawned. Waiting for initialization...');
        await delay(3500);
      } catch (runErr: any) {
        logger.error('❌ Docker Auto-start failed. Please ensure Redis or Docker is running on host.', runErr.message);
        isRedisAvailable = false;
        return false;
      }
    }

    // Attempt ping validation again after container starts
    let retryClient: Redis | null = null;
    try {
      retryClient = new Redis(url, {
        maxRetriesPerRequest: 0,
        connectTimeout: 1500,
        retryStrategy: () => null,
      });
      await retryClient.ping();
      isRedisAvailable = true;
      logger.info('✅ Redis is now running and reachable via Docker auto-start.');
      retryClient.disconnect();
      return true;
    } catch (finalErr: any) {
      if (retryClient) retryClient.disconnect();
      logger.error('❌ Redis is still unreachable after Docker commands. Build queues disabled.', finalErr.message);
      isRedisAvailable = false;
      return false;
    }
  }
}

/**
 * Setter to manually override/update Redis connectivity state from other listeners.
 */
export function setRedisAvailable(available: boolean) {
  isRedisAvailable = available;
}
