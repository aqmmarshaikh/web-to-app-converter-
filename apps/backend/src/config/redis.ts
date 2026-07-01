import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';
import { setRedisAvailable } from '../utils/redis-check';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
}) as any;

redis.on('connect', () => {
  logger.info('Redis connected');
  setRedisAvailable(true);
});

redis.on('error', (err: any) => {
  // Prevent flooding error stacks by logging just the message in development
  logger.error('Redis error:', err.message || err);
  setRedisAvailable(false);
});
