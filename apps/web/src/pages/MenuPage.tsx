import { useEffect, useState } from 'react';
import { getMenu } from '../api/menu';
import MenuItemCard from '../components/MenuItemCard';
import type { MenuItem } from '../types/menu';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    getMenu()
      .then((menu) => {
        setItems(menu);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold">Menu</h1>
      {status === 'loading' && <p>Loading menu…</p>}
      {status === 'error' && (
        <p role="alert">Couldn't load the menu. Is the API running?</p>
      )}
      {status === 'ready' && items.length === 0 && (
        <p>No items yet. Run npm run seed.</p>
      )}
      <ul className="grid gap-4">
        {items.map((item) => (
          <MenuItemCard key={item._id} item={item} />
        ))}
      </ul>
    </section>
  );
}
