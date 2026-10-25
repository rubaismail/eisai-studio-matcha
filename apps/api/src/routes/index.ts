
 // Every URL the API serves is listed here. Add a line when you add a routes file.
import { Router } from 'express';
import mongoose from 'mongoose';
import menuRoutes from './menu.routes.js';
import loginRoutes from './login.routes.js';

const router = Router();

// GET /api/health
router.get('/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res
    .status(connected ? 200 : 503)
    .json({ status: connected ? 'ok' : 'database disconnected' });
});

// Menu endpoints
router.use('/menu', menuRoutes);

// Authentication endpoints
router.use('/auth', loginRoutes);

export default router;
