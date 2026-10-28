// Every URL the API serves is listed here. Add a line when you add a routes file.
import { Router } from 'express';
import mongoose from 'mongoose';
import menuRoutes from './menu.routes.js';
import uploadRoutes from './upload.routes.js';
import { requireAdmin } from '../middleware/auth.js';
import { listAdminMenu } from '../controllers/menu.controller.js';

const router = Router();

router.get('/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res
    .status(connected ? 200 : 503)
    .json({ status: connected ? 'ok' : 'database disconnected' });
});
router.get('/admin/menu', requireAdmin, listAdminMenu);
router.use('/menu', menuRoutes);
router.use('/uploads', uploadRoutes);

export default router;
