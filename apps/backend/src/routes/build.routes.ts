import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBuildSchema } from '@appforge/shared';
import {
  createBuild,
  getBuild,
  getBuildDebug,
  listBuilds,
  listProjectBuilds,
  downloadBuild,
  getDashboardStats,
} from '../controllers/build.controller';

const router = Router();

// All build routes require authentication
router.use(authenticate);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Build routes
router.post('/', validate(createBuildSchema), createBuild);
router.get('/', listBuilds);
router.get('/:id/debug', getBuildDebug);
router.get('/:id', getBuild);
router.get('/:id/download', downloadBuild);

export default router;
