
import { Router } from 'express';
import {
  createMenuItem,
  deleteMenuItem,
  listAdminMenu,
  listMenu,
  listSeasonalMenu,
  updateMenuItem,
} from '../controllers/menu.controller.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/menu - List available menu items
router.get('/', listMenu);

// GET /api/menu/seasonal - List available seasonal items
router.get('/seasonal', listSeasonalMenu);

// GET /api/menu/admin/menu - List all items for admin dashboard
router.get('/admin/menu', requireAdmin, listAdminMenu);
router.get('/admin-menu', requireAdmin, listAdminMenu);

// POST /api/menu - Create a menu item as admin
router.post('/', requireAdmin, createMenuItem);

// PUT /api/menu/:id - Update or hide/unhide a menu item as admin
router.put('/:id', requireAdmin, updateMenuItem);

// DELETE /api/menu/:id - Permanently delete a menu item as admin
router.delete('/:id', requireAdmin, deleteMenuItem);

export default router;
