export interface MenuItem {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
}
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
);
export async function getMenu(signal?: AbortSignal): Promise<MenuItem[]> {
  const response = await fetch(`${baseUrl}/menu`, { signal });
  if (!response.ok) throw new Error('Menu request failed');
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('items' in data) ||
    !Array.isArray(data.items) ||
    !data.items.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      return (
        'slug' in item &&
        typeof item.slug === 'string' &&
        'name' in item &&
        typeof item.name === 'string' &&
        'description' in item &&
        typeof item.description === 'string' &&
        'priceCents' in item &&
        typeof item.priceCents === 'number'
      );
    })
  )
    throw new Error('Unexpected menu response');
  return data.items;
}
