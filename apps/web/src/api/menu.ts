import { apiGet } from './client';
import type { MenuItem } from '../types/menu';

export async function getMenu(): Promise<MenuItem[]> {
  const data = await apiGet<{ items: MenuItem[] }>('/menu');
  return data.items;
}
