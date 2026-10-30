
import { Router } from 'express';
import { listAdminMenu } from '../controllers/menu.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

router.get('/menu', requireAuth, requireAdmin, listAdminMenu);

export default router;