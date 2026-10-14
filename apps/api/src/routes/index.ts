// Every URL the API serves is listed here. Add a line when you add a routes file.
import { Router } from 'express';
import mongoose from 'mongoose';
import menuRoutes from './menu.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res
    .status(connected ? 200 : 503)
    .json({ status: connected ? 'ok' : 'database disconnected' });
});
router.use('/menu', menuRoutes);

export default router;
