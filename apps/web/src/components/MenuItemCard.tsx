import type { MenuItem } from '../types/menu';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    price,
  );

export default function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <li className="rounded-xl border border-matcha-light p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{item.name}</h2>
        <span>{formatPrice(item.price)}</span>
      </div>
      {item.description && <p className="mt-2">{item.description}</p>}
    </li>
  );
}
