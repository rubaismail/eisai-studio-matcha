
import { Router } from 'express';
import {
  listMenu,
  listSeasonalMenu,
} from '../controllers/menu.controller.js';

const router = Router();

// GET /api/menu - List available menu items
router.get('/', listMenu);

// GET /api/menu/seasonal - List available seasonal items
router.get('/seasonal', listSeasonalMenu);

// Admin routes (POST, PUT, DELETE) will be added later.
export default router;
