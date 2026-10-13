import { useEffect, useState } from 'react';
import { getMenu, type MenuItem } from './api';
export default function App() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState('Loading sample menu…');
  useEffect(() => {
    const controller = new AbortController();
    getMenu(controller.signal)
      .then((menu) => {
        setItems(menu);
        setStatus(
          menu.length
            ? 'API and database connected.'
            : 'Connected. Run npm run db:seed to load sample data.',
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus(
            'Cannot reach the API. Check local services and API configuration.',
          );
      });
    return () => controller.abort();
  }, []);
  return (
    <main>
      <p className="eyebrow">TEAM 22 · DEVELOPMENT</p>
      <h1>Eisai Studio</h1>
      <p>
        This starter verifies the React → Express → MongoDB connection. Sample
        content and styling are not the client’s approved design.
      </p>
      <p role="status">{status}</p>
      <ul>
        {items.map((item) => (
          <li key={item.slug}>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(item.priceCents / 100)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
