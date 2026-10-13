export interface MenuItem {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  published: boolean;
}
export const sampleMenu: MenuItem[] = [
  {
    slug: 'sample-classic-matcha',
    name: 'Sample Matcha Latte',
    description: 'Development sample; replace with client-approved content.',
    priceCents: 600,
    published: true,
  },
  {
    slug: 'sample-seasonal-matcha',
    name: 'Sample Seasonal Matcha',
    description: 'Development sample; not a confirmed client menu item.',
    priceCents: 700,
    published: true,
  },
];
