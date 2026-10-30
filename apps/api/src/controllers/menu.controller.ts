
import type { Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.js';

// GET /api/menu - List all available menu items
export async function listMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({ isAvailable: true }).sort({ name: 1 });

  res.json({ items });
}

// GET /api/menu/seasonal - List available seasonal items
export async function listSeasonalMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({
    isAvailable: true,
    isSeasonal: true,
  }).sort({ name: 1 });

  res.json({ items });
}


 // GET /api/admin/menu - All menu items, including hidden ones
export async function listAdminMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({}).sort({ name: 1 });

  res.json({ items });
}