
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MenuItem } from '../models/MenuItem.js';

const editableFields = new Set([
  'name',
  'description',
  'price',
  'category',
  'imageUrl',
  'isSeasonal',
  'isAvailable',
]);

function validateObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid menu item ID') as Error & { status?: number };
    error.status = 400;
    throw error;
  }
}

function ensureAllowedMenuFields(body: Record<string, unknown>) {
  const keys = Object.keys(body ?? {});
  for (const key of keys) {
    if (!editableFields.has(key)) {
      const error = new Error(`Invalid field: ${key}`) as Error & { status?: number };
      error.status = 400;
      throw error;
    }
  }
}

function validateMenuPayload(payload: Record<string, unknown>, { allowCreate }: { allowCreate: boolean }) {
  ensureAllowedMenuFields(payload);

  if (allowCreate && (!payload.name || typeof payload.name !== 'string' || payload.name.trim() === '')) {
    const error = new Error('Name is required') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (payload.name !== undefined && (typeof payload.name !== 'string' || payload.name.trim() === '')) {
    const error = new Error('Name must be a non-empty string') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (
    allowCreate &&
    (payload.price === undefined || typeof payload.price !== 'number' || !Number.isFinite(payload.price) || payload.price < 0)
  ) {
    const error = new Error('Price must be a nonnegative finite number') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (
    payload.price !== undefined &&
    (typeof payload.price !== 'number' || !Number.isFinite(payload.price) || payload.price < 0)
  ) {
    const error = new Error('Price must be a nonnegative finite number') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (payload.category !== undefined && (typeof payload.category !== 'string' || payload.category.trim() === '')) {
    const error = new Error('Category must be a non-empty string') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (payload.description !== undefined && typeof payload.description !== 'string') {
    const error = new Error('Description must be a string') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (payload.imageUrl !== undefined && typeof payload.imageUrl !== 'string') {
    const error = new Error('imageUrl must be a string') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (payload.isSeasonal !== undefined && typeof payload.isSeasonal !== 'boolean') {
    const error = new Error('isSeasonal must be a boolean') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (payload.isAvailable !== undefined && typeof payload.isAvailable !== 'boolean') {
    const error = new Error('isAvailable must be a boolean') as Error & { status?: number };
    error.status = 400;
    throw error;
  }
}

export async function listMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({ isAvailable: true }).sort({ name: 1 });
  res.json({ items });
}

export async function listSeasonalMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({
    isAvailable: true,
    isSeasonal: true,
  }).sort({ name: 1 });

  res.json({ items });
}

export async function listAdminMenu(_req: Request, res: Response) {
  const items = await MenuItem.find({}).sort({ name: 1 });
  res.json({ items });
}

export async function createMenuItem(req: Request, res: Response) {
  const payload = req.body ?? {};

  validateMenuPayload(payload, { allowCreate: true });

  const item = await MenuItem.create({
    name: String(payload.name).trim(),
    description: typeof payload.description === 'string' ? payload.description : '',
    price: Number(payload.price),
    category: typeof payload.category === 'string' && payload.category.trim() ? payload.category : 'Drinks',
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : '',
    isSeasonal: Boolean(payload.isSeasonal ?? false),
    isAvailable: Boolean(payload.isAvailable ?? true),
  });

  res.status(201).json({ item });
}

export async function updateMenuItem(req: Request, res: Response) {
  const menuId = typeof req.params.id === 'string' ? req.params.id : '';
  validateObjectId(menuId);

  const item = await MenuItem.findById(menuId);
  if (!item) {
    res.status(404).json({ error: 'Menu item not found' });
    return;
  }

  const payload = req.body ?? {};
  if (Object.keys(payload).length === 0) {
    const error = new Error('At least one field is required') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  validateMenuPayload(payload, { allowCreate: false });

  const allowedUpdates = {
    ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
    ...(payload.description !== undefined ? { description: String(payload.description) } : {}),
    ...(payload.price !== undefined ? { price: Number(payload.price) } : {}),
    ...(payload.category !== undefined ? { category: String(payload.category).trim() } : {}),
    ...(payload.imageUrl !== undefined ? { imageUrl: String(payload.imageUrl) } : {}),
    ...(payload.isSeasonal !== undefined ? { isSeasonal: Boolean(payload.isSeasonal) } : {}),
    ...(payload.isAvailable !== undefined ? { isAvailable: Boolean(payload.isAvailable) } : {}),
  };

  Object.assign(item, allowedUpdates);
  await item.save();

  res.json({ item });
}

export async function deleteMenuItem(req: Request, res: Response) {
  const menuId = typeof req.params.id === 'string' ? req.params.id : '';
  validateObjectId(menuId);

  const item = await MenuItem.findById(menuId);
  if (!item) {
    res.status(404).json({ error: 'Menu item not found' });
    return;
  }

  await item.deleteOne();
  res.json({ message: 'Menu item deleted.' });
}
