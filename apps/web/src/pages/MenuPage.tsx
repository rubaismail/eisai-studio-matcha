import { useEffect, useRef, useState } from 'react';
import { getMenu } from '../api/menu';
import searchIcon from '../assets/search-icon.svg';
import DrinkTile from '../components/DrinkTile';
import { focusRing, label, primaryButton } from '../components/styles';
import type { MenuItem } from '../types/menu';

type Filter = 'all' | 'matcha' | 'hojicha' | 'recommended';

const filters: {
  id: Filter;
  label: string;
  has: (item: MenuItem) => boolean;
}[] = [
  { id: 'all', label: 'All', has: () => true },
  {
    id: 'matcha',
    label: 'Matcha',
    has: (item) => item.teaBases?.includes('matcha') ?? false,
  },
  {
    id: 'hojicha',
    label: 'Hojicha',
    has: (item) => item.teaBases?.includes('hojicha') ?? false,
  },
  {
    id: 'recommended',
    label: 'Recommended',
    has: (item) => item.isRecommended,
  },
];

// The matcha choices for the classic latte. Set by Eisai, not the menu API.
const classicMatchas = [
  { name: 'Chiyo Midori', notes: 'Floral, Pistachio, Spring blossom, Honey' },
  { name: 'Yugen', notes: 'Sweet Cream Butter, Walnut, Barley' },
  { name: 'Shun Midori', notes: 'Mellow Umami, Creamy, Pistachio' },
];

function matchesSearch(item: MenuItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.inspiredBy, item.description].some((text) =>
    text?.toLowerCase().includes(q),
  );
}

const stateBox = 'flex flex-col items-start gap-4 border-t border-ink py-14';
const stateTitle =
  'text-[34px] leading-[1.15] tracking-[-0.02em] lg:text-[44px]';
const stateText =
  'text-[16px] leading-[25px] text-ink-muted lg:text-[17px] lg:leading-[26px]';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getMenu()
      .then((menu) => {
        if (!active) return;
        setItems(menu);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }

  const current = filters.find((f) => f.id === filter)!;
  const shown = items.filter(
    (item) => current.has(item) && matchesSearch(item, query),
  );
  const ready = status === 'ready';
  const emptyMenu = ready && items.length === 0;

  let count = '';
  if (status === 'loading') count = 'Loading the menu…';
  else if (ready && !emptyMenu)
    count = `${shown.length} ${shown.length === 1 ? 'drink' : 'drinks'}`;

  return (
    <>
      <header className="flex flex-col gap-3.5 px-4 pt-12 pb-8 lg:flex-row lg:items-end lg:justify-between lg:px-[43px] lg:pt-[72px] lg:pb-10">
        <div className="flex flex-col gap-3.5 lg:gap-4">
          <p className={label}>The menu</p>
          <h1 className="text-[56px] leading-[54px] tracking-[-0.02em] lg:text-[115px] lg:leading-[106px]">
            Our drinks.
          </h1>
        </div>
        <p className="text-[16px] leading-[25px] lg:w-[380px] lg:text-[18px] lg:leading-[29px]">
          Every customer has a different palate.
          <br />
          Every matcha has a different character.
        </p>
      </header>

      <section
        aria-labelledby="classic-heading"
        className="px-4 pb-12 lg:px-[43px] lg:pb-18"
      >
        <div className="flex flex-col border-y border-ink lg:flex-row">
          <div className="flex flex-col gap-2.5 py-6 lg:w-[452px] lg:shrink-0 lg:gap-3 lg:py-8 lg:pr-10">
            <p className={label}>Eisai’s Classic · Clear</p>
            <h2
              id="classic-heading"
              className="text-[34px] tracking-[-0.02em] lg:text-[44px] lg:leading-[44px]"
            >
              Iced matcha latte
            </h2>
            <div className="flex flex-col gap-1.5 border-t border-rule pt-3.5 lg:pt-4">
              <p className={label}>Iced latte</p>
              <p className="text-[26px] lg:text-[28px] lg:leading-[28px]">
                Tokusen
              </p>
            </div>
          </div>
          {classicMatchas.map((matcha) => (
            <div
              key={matcha.name}
              className="flex flex-col gap-1.5 border-t border-rule py-[18px] lg:flex-1 lg:gap-2.5 lg:border-t-0 lg:border-l lg:px-6 lg:py-8"
            >
              <p className="text-[26px] tracking-[-0.02em] lg:text-[32px] lg:leading-[32px]">
                {matcha.name}
              </p>
              <p className="text-[15px] leading-[22px] text-ink-muted lg:leading-[23px]">
                {matcha.notes}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="all-drinks-heading"
        className="px-4 pb-18 lg:px-[43px] lg:pb-26"
      >
        <h2 id="all-drinks-heading" className="sr-only">
          All drinks
        </h2>
        {!emptyMenu && (
          <div className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Filter drinks"
              className="flex flex-wrap gap-2"
            >
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`h-11 border border-ink px-4 font-mono text-[12px] tracking-[0.08em] uppercase lg:px-5 lg:text-[13px] ${focusRing} ${
                    filter === f.id ? 'bg-ink text-white' : 'bg-white text-ink'
                  }`}
                >
                  {f.label}
                  {ready && ` (${items.filter(f.has).length})`}
                </button>
              ))}
            </div>
            {/* Above the chips on phones. */}
            <label className="order-first flex h-11 items-center gap-2.5 border border-ink bg-white px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink lg:order-none lg:w-[340px]">
              <img src={searchIcon} alt="" width={16} height={16} />
              <span className="sr-only">Search drinks</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search drinks"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-placeholder"
              />
            </label>
          </div>
        )}

        <p role="status" className={`${label} mb-4 text-ink-muted`}>
          {count}
        </p>

        {status === 'loading' && (
          <div
            aria-hidden="true"
            className="grid gap-8 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-4 lg:gap-y-10"
          >
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col gap-3.5">
                <div className="aspect-[4/5] bg-tile" />
                <div className="h-3 w-[55%] bg-rule" />
                <div className="h-3 w-[84%] bg-rule" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className={stateBox}>
            <p className={`${label} text-ink-muted`}>Menu</p>
            <h2 className={stateTitle}>A little hiccup.</h2>
            <p className={stateText}>
              We couldn’t load the menu right now. Check your connection and try
              again.
            </p>
            <button type="button" onClick={retry} className={primaryButton}>
              Try again →
            </button>
            <p className={`${label} text-ink-muted`}>
              Your next shade of matcha is worth another try.
            </p>
          </div>
        )}

        {emptyMenu && (
          <div className={stateBox}>
            <h2 className={stateTitle}>No drinks on the menu yet.</h2>
            <p className={stateText}>
              Check back soon, or follow @eisaistudio to see what we’re making
              this week.
            </p>
          </div>
        )}

        {ready && !emptyMenu && shown.length === 0 && (
          <div className={stateBox}>
            <h2 className={stateTitle}>No matches this time.</h2>
            {query.trim() ? (
              <>
                <p className={stateText}>
                  No drinks match “{query.trim()}”. Try a different search or
                  clear it to see the menu.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className={primaryButton}
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className={stateText}>
                  There are no {current.label.toLowerCase()} drinks on the menu
                  right now.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={primaryButton}
                >
                  Show all drinks
                </button>
              </>
            )}
          </div>
        )}

        {shown.length > 0 && (
          <ul className="grid gap-8 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-4 lg:gap-y-10">
            {shown.map((item) => (
              <li key={item._id}>
                <DrinkTile item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
