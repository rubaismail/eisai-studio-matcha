import { apiGet, apiRequest } from './client';
import type { MenuItem } from '../types/menu';

export async function getMenu(): Promise<MenuItem[]> {
  const data = await apiGet<{ items: MenuItem[] }>('/menu');
  return data.items;
}

// Admin only: every item, including hidden ones.
export async function getAdminMenu(): Promise<MenuItem[]> {
  const data = await apiRequest<{ items: MenuItem[] }>('/menu/admin/menu');
  return data.items;
}

// The on/off settings staff can change straight from the menu list.
export type MenuFlag = 'isAvailable' | 'isRecommended' | 'isFeatured';

export async function setMenuFlag(
  id: string,
  flag: MenuFlag,
  value: boolean,
): Promise<MenuItem> {
  const data = await apiRequest<{ item: MenuItem }>(`/menu/${id}`, {
    method: 'PUT',
    body: { [flag]: value },
  });
  return data.item;
}

export function setOnMenu(id: string, isAvailable: boolean): Promise<MenuItem> {
  return setMenuFlag(id, 'isAvailable', isAvailable);
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/menu/${id}`, { method: 'DELETE' });
}
