import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '@appforge/shared';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  duplicateProject,
} from '../controllers/project.controller';

const router = Router();

// All project routes require authentication
router.use(authenticate);

router.post('/', validate(createProjectSchema), createProject);
router.get('/', listProjects);
router.get('/:id', getProject);
router.put('/:id', validate(updateProjectSchema), updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/duplicate', duplicateProject);

export default router;
