import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAdminStats,
  listUsers,
  listAllBuilds,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.get('/builds', listAllBuilds);

export default router;
