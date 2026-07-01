import { logger } from '../utils/logger';

/**
 * Validates that all required environment variables are set.
 * If any required variables are missing, prints the details and halts server startup.
 */
export function validateEnv(): void {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
  ];

  const missing = requiredVars.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    logger.error('❌ CRITICAL ERROR: Server startup halted due to missing required environment variables:');
    missing.forEach((name) => {
      logger.error(`   - ${name}`);
    });
    console.error('\nPlease check your .env configuration files and retry.\n');
    process.exit(1);
  }

  logger.info('✅ Environment variables validation passed.');
}
