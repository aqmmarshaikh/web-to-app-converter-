import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fallback: also try root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  // App
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:4000',

  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Email
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@appforge.dev',

  // Build
  KEYSTORE_PATH: process.env.KEYSTORE_PATH || './keys/debug.keystore',
  KEYSTORE_PASSWORD: process.env.KEYSTORE_PASSWORD || 'android',
  KEY_ALIAS: process.env.KEY_ALIAS || 'androiddebugkey',
  KEY_PASSWORD: process.env.KEY_PASSWORD || 'android',
  MAX_BUILD_TIME_MS: parseInt(process.env.MAX_BUILD_TIME_MS || '300000', 10),
  MAX_PROJECT_SIZE_MB: parseInt(process.env.MAX_PROJECT_SIZE_MB || '100', 10),
  BUILD_CLEANUP_HOURS: parseInt(process.env.BUILD_CLEANUP_HOURS || '24', 10),
  MAX_CONCURRENT_BUILDS: parseInt(process.env.MAX_CONCURRENT_BUILDS || '5', 10),

  // Docker
  DOCKER_BUILDER_IMAGE: process.env.DOCKER_BUILDER_IMAGE || 'appforge/android-builder:latest',
  DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || 'tmp/downloads',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Computed
  get isDev() {
    return this.NODE_ENV === 'development';
  },
  get isProd() {
    return this.NODE_ENV === 'production';
  },
} as const;
