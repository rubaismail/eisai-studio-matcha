
 // Every URL the API serves is listed here. Add a line when you add a routes file.
import { Router } from 'express';
import mongoose from 'mongoose';
import menuRoutes from './menu.routes.js';
import loginRoutes from './login.routes.js';
import authRoutes from "./auth.routes.js";
import uploadRoutes from './upload.routes.js';
import adminMenuRoutes from './adminMenu.routes.js';

const router = Router();

// GET /api/health
router.get('/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res
    .status(connected ? 200 : 503)
    .json({ status: connected ? 'ok' : 'database disconnected' });
});

router.use('/menu', menuRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminMenuRoutes);

// Authentication endpoints
router.use('/auth', loginRoutes);

// Registration endpoints
router.use("/auth", authRoutes);

export default router;
