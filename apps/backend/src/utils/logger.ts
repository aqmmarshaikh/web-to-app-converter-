import winston from 'winston';
import { env } from '../config/env';
import { getRequestId } from './context';

const { combine, timestamp, colorize, printf, errors } = winston.format;

// Development format showing colored request IDs
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    const requestId = getRequestId();
    const reqStr = requestId ? ` \x1b[35m[reqId:${requestId}]\x1b[0m` : '';
    return `${timestamp} ${level}:${reqStr} ${stack || message}`;
  })
);

// Format transformer to append request ID dynamically in JSON structured logging
const addRequestId = winston.format((info) => {
  const requestId = getRequestId();
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

const prodFormat = combine(
  addRequestId(),
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.isDev ? 'debug' : 'info',
  format: env.isDev ? devFormat : prodFormat,
  defaultMeta: { service: 'appforge-api' },
  transports: [
    new winston.transports.Console(),
  ],
});
