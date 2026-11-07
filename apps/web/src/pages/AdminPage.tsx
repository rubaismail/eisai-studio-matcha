import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  deleteMenuItem,
  getAdminMenu,
  setMenuFlag,
  setOnMenu,
} from '../api/menu';
import type { MenuFlag } from '../api/menu';
import type { MenuItem } from '../types/menu';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]';
const button = `inline-flex min-h-12 items-center justify-center border text-center font-mono text-[13px] tracking-[0.08em] uppercase disabled:cursor-not-allowed disabled:opacity-60 md:text-[14px] ${focusRing}`;
const blackButton = `${button} border-[#1a1a1a] bg-[#1a1a1a] text-white`;
const whiteButton = `${button} border-[#1a1a1a] bg-white text-[#1a1a1a]`;
const redButton = `${button} border-[#b42318] bg-[#b42318] text-white`;
const smallLabel = 'font-mono text-[13px] tracking-[0.08em] uppercase';

const toggles: { flag: MenuFlag; label: string }[] = [
  { flag: 'isAvailable', label: 'On menu' },
  { flag: 'isRecommended', label: 'Recommended' },
  { flag: 'isFeatured', label: 'On home' },
];

function DrinkRow({
  item,
  onUpdated,
  onDeleteClick,
}: {
  item: MenuItem;
  onUpdated: (item: MenuItem) => void;
  onDeleteClick: (item: MenuItem, trigger: HTMLButtonElement) => void;
}) {
  // All of the row's checkboxes are disabled while one saves. Each reply is the
  // whole item, so a slower reply could otherwise undo a newer change.
  const [saving, setSaving] = useState<MenuFlag | null>(null);
  const [error, setError] = useState('');
  const checkboxes = useRef<Partial<Record<MenuFlag, HTMLInputElement | null>>>(
    {},
  );
  const refocus = useRef<MenuFlag | null>(null);
  const hidden = !item.isAvailable;

  // A disabled checkbox loses keyboard focus, so give it back when it re-enables.
  useEffect(() => {
    if (saving === null && refocus.current) {
      checkboxes.current[refocus.current]?.focus();
      refocus.current = null;
    }
  }, [saving]);

  async function handleToggle(flag: MenuFlag, value: boolean) {
    refocus.current =
      document.activeElement === checkboxes.current[flag] ? flag : null;
    setSaving(flag);
    setError('');
    try {
      onUpdated(await setMenuFlag(item._id, flag, value));
    } catch {
      setError(`Couldn't update ${item.name}. Please try again.`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <li className="border-b border-[#e4e4e4] py-4 md:py-4.5">
      {/* Phone: photo and name, then checkboxes, then actions, each full width.
          Tablet: checkboxes sit under the name, with actions on the right.
          Desktop: everything on one line, like the Figma frame. */}
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2.5 md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:gap-x-7 md:gap-y-1 lg:grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] lg:gap-y-0">
        <div className="flex h-17.5 w-14 items-center justify-center bg-[#f4f4f4] md:row-span-2 md:h-22.5 md:w-18 lg:row-span-1">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              className={`h-15 w-9 object-contain md:h-19 md:w-11 ${hidden ? 'opacity-55' : ''}`}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1 md:gap-1.5 md:self-end lg:self-center">
          <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
            {/* Hidden rows use a lighter gray that still passes AA contrast. */}
            <h2
              className={`text-[22px] font-normal md:text-[28px] md:leading-7 md:tracking-[-0.02em] ${hidden ? 'text-[#6b6b6b]' : 'text-[#1a1a1a]'}`}
            >
              {item.name}
            </h2>
            {hidden && (
              <span className="border border-dashed border-[#1a1a1a] px-1.5 py-0.5 font-mono text-[11px] tracking-[0.08em] text-[#1a1a1a] uppercase md:px-2 md:py-0.75">
                Hidden
              </span>
            )}
          </div>
          {item.description && (
            <p
              className={`text-[13px] leading-4.5 md:text-[14px] md:leading-5 ${hidden ? 'text-[#6b6b6b]' : 'text-[#4a4a4a]'}`}
            >
              {item.description}
            </p>
          )}
        </div>

        <div className="col-span-2 flex flex-wrap gap-x-3.5 md:col-span-1 md:col-start-2 md:gap-x-5 lg:col-start-3 lg:row-start-1 lg:flex-nowrap">
          {toggles.map(({ flag, label }) => (
            <label
              key={flag}
              className={`flex min-h-11 items-center gap-2.5 text-[#1a1a1a] ${smallLabel}`}
            >
              <input
                ref={(el) => {
                  checkboxes.current[flag] = el;
                }}
                type="checkbox"
                checked={item[flag]}
                disabled={saving !== null}
                onChange={(e) => void handleToggle(flag, e.target.checked)}
                className={`size-5 shrink-0 accent-[#1a1a1a] disabled:cursor-not-allowed ${focusRing}`}
              />
              <span>
                {label}
                <span className="sr-only">: {item.name}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="col-span-2 flex flex-col gap-2.5 md:col-span-1 md:col-start-3 md:row-span-2 md:row-start-1 md:flex-row md:items-center md:gap-5 lg:col-start-4 lg:row-span-1">
          <Link
            to={`/admin/${item._id}/edit`}
            className={`${whiteButton} w-full px-4 md:w-auto md:px-7`}
          >
            Edit <span className="sr-only">{item.name}</span>
          </Link>
          <button
            type="button"
            onClick={(e) => onDeleteClick(item, e.currentTarget)}
            className={`min-h-11 text-[#b42318] underline ${smallLabel} ${focusRing}`}
          >
            Delete <span className="sr-only">{item.name}</span>
          </button>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 text-[14px] text-[#b42318] md:text-right"
        >
          {error}
        </p>
      )}
    </li>
  );
}

function DeleteDialog({
  item,
  onCancel,
  onDeleted,
  onHidden,
}: {
  item: MenuItem;
  onCancel: () => void;
  onDeleted: (id: string) => void;
  onHidden: (item: MenuItem) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Start on Cancel, the safe choice. Also runs after a failed request, because
  // the buttons were disabled while it was pending and focus was lost.
  useEffect(() => {
    if (!busy) cancelRef.current?.focus();
  }, [busy]);

  // Listens on the document so these keys still work after a click on the scrim.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (!busy) onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      // Keep Tab inside the dialog, since everything behind it is off limits.
      const buttons =
        dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        ) ?? [];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;
      const outside = !dialogRef.current?.contains(active);
      if (!first || !last) {
        e.preventDefault();
      } else if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await deleteMenuItem(item._id);
      onDeleted(item._id);
    } catch {
      setError(`Couldn't delete ${item.name}. Please try again.`);
      setBusy(false);
    }
  }

  async function handleHide() {
    setBusy(true);
    setError('');
    try {
      onHidden(await setOnMenu(item._id, false));
    } catch {
      setError(`Couldn't hide ${item.name}. Please try again.`);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a1a1a]/55 sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="flex max-h-full w-full flex-col gap-4 overflow-y-auto bg-white px-5 py-7 sm:w-130 sm:max-w-full sm:gap-5 sm:border sm:border-[#1a1a1a] sm:p-9"
      >
        <p className={`text-[#b42318] ${smallLabel}`}>Delete drink</p>
        <h2
          id={titleId}
          className="text-[30px] leading-8.5 font-normal text-[#1a1a1a] sm:text-[36px] sm:leading-10 sm:tracking-[-0.02em]"
        >
          Delete {item.name}?
        </h2>
        <p
          id={descriptionId}
          className="text-[16px] leading-6 text-[#4a4a4a] sm:text-[17px] sm:leading-6.5"
        >
          Deleting can’t be undone. To take a drink off the menu for now, turn
          off “On menu” instead.
        </p>
        {error && (
          <p role="alert" className="text-[14px] text-[#b42318]">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className={`${redButton} px-4`}
          >
            Delete for good
          </button>
          {item.isAvailable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleHide()}
              className={`${whiteButton} px-4`}
            >
              Hide instead
            </button>
          )}
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={`${whiteButton} px-4`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const deleteTarget = items.find((item) => item._id === deleteId);
  const onMenuCount = items.filter((item) => item.isAvailable).length;
  // A hidden drink can't appear on the home page, so it doesn't count.
  const onHomeCount = items.filter(
    (item) => item.isAvailable && item.isFeatured,
  ).length;

  useEffect(() => {
    getAdminMenu()
      .then((menu) => {
        setItems(menu);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  // Runs once the dialog is gone, so focus isn't lost along with it.
  useEffect(() => {
    if (deleteId === null && returnFocusTo.current) {
      returnFocusTo.current.focus();
      returnFocusTo.current = null;
    }
  }, [deleteId]);

  function updateItem(updated: MenuItem) {
    setItems((current) =>
      current.map((item) => (item._id === updated._id ? updated : item)),
    );
  }

  function handleDeleted(id: string) {
    // The row's Delete button is gone now, so focus moves to the page heading.
    returnFocusTo.current = headingRef.current;
    setAnnouncement(`${deleteTarget?.name ?? 'Drink'} deleted.`);
    setItems((current) => current.filter((item) => item._id !== id));
    setDeleteId(null);
  }

  function handleHidden(updated: MenuItem) {
    setAnnouncement(`${updated.name} hidden.`);
    updateItem(updated);
    setDeleteId(null);
  }

  return (
    <section className="bg-white px-4 pt-7 pb-14 md:px-[43px] md:pt-12 md:pb-24">
      <div className="flex flex-col gap-5 pb-5 md:flex-row md:items-end md:justify-between md:pb-6">
        <div className="flex flex-col gap-2 md:gap-2.5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-[44px] font-normal tracking-[-0.02em] text-[#1a1a1a] outline-none md:text-[56px] md:leading-14"
          >
            Menu
          </h1>
          {status === 'ready' && (
            <p className="font-mono text-[12px] tracking-[0.08em] text-[#4a4a4a] uppercase md:text-[13px]">
              {items.length} {items.length === 1 ? 'drink' : 'drinks'} ·{' '}
              {onMenuCount} on the menu · {onHomeCount} on home
            </p>
          )}
        </div>
        <Link
          to="/admin/new"
          className={`${blackButton} w-full px-4 md:w-auto md:px-7`}
        >
          + Add a drink
        </Link>
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {status === 'loading' && (
        <p className="text-[#1a1a1a]">Loading drinks…</p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-[#b42318]">
          Couldn't load the menu. Check that you're signed in and the API is
          running.
        </p>
      )}
      {status === 'ready' && items.length === 0 && (
        <p className="border-t border-[#1a1a1a] pt-5 text-[#1a1a1a]">
          No drinks yet
        </p>
      )}
      {items.length > 0 && (
        <>
          <ul className="border-t border-[#1a1a1a]">
            {items.map((item) => (
              <DrinkRow
                key={item._id}
                item={item}
                onUpdated={updateItem}
                onDeleteClick={(target, trigger) => {
                  returnFocusTo.current = trigger;
                  setDeleteId(target._id);
                }}
              />
            ))}
          </ul>
          <p className="mt-4 text-[14px] leading-5 text-[#4a4a4a]">
            Hiding a drink takes it off the public menu without deleting it, so
            it’s easy to bring back next season.
          </p>
        </>
      )}

      {deleteTarget && (
        <DeleteDialog
          item={deleteTarget}
          onCancel={() => setDeleteId(null)}
          onDeleted={handleDeleted}
          onHidden={handleHidden}
        />
      )}
    </section>
  );
}
