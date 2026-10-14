import type { Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.js';

// GET /api/menu — everything customers can see.
export async function listMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({ isAvailable: true }).sort({ name: 1 });
  res.json({ items });
}
