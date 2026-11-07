// The add/edit drink form, shown in the dashboard's panel for /admin/new and
// /admin/:id/edit.
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/client';
import { createMenuItem, updateMenuItem, uploadMenuImage } from '../api/menu';
import type { MenuItemInput } from '../api/menu';
import type { MenuItem } from '../types/menu';

type Base = '' | 'matcha' | 'hojicha' | 'both';
type FieldName = 'name' | 'price' | 'imageAlt';
// After a photo is replaced, its old description has to be reviewed before saving.
type AltReview = 'none' | 'needed' | 'confirmed';

interface FormValues {
  name: string;
  inspiredBy: string;
  base: Base;
  price: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  isAvailable: boolean;
  isRecommended: boolean;
  isFeatured: boolean;
  isSeasonal: boolean;
}

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPE_ERROR =
  'That file type can’t be used. Choose a JPG, PNG or WebP photo.';
const PHOTO_SIZE_ERROR =
  'That photo is larger than 5 MB. Choose a smaller photo.';
const PHOTO_UPLOAD_ERROR =
  'Couldn’t upload that photo. Please try again. Everything else you entered is still here.';

const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Drink name',
  price: 'Price',
  imageAlt: 'Describe the photo',
};

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]';
const button = `inline-flex min-h-12 w-full items-center justify-center border px-4 text-center font-mono text-[13px] tracking-[0.08em] uppercase disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-7 md:text-[14px] ${focusRing}`;
const smallLabel = 'font-mono text-[13px] tracking-[0.08em] uppercase';
const hint = 'text-[14px] leading-5 text-[#4a4a4a]';
const errorText = 'text-[14px] leading-5 text-[#b42318]';
const inputBox = (invalid: boolean) =>
  invalid
    ? 'border-2 border-[#b42318] bg-[#fff5f0]'
    : 'border border-[#1a1a1a] bg-white';
const textInput = (invalid: boolean) =>
  `w-full px-3.5 py-3 text-[16px] leading-[22px] text-[#1a1a1a] placeholder:text-[#595959] ${inputBox(invalid)} ${focusRing}`;

function toValues(item?: MenuItem): FormValues {
  if (!item) {
    return {
      name: '',
      inspiredBy: '',
      base: '',
      price: '',
      description: '',
      imageUrl: '',
      imageAlt: '',
      isAvailable: true,
      isRecommended: false,
      isFeatured: false,
      isSeasonal: false,
    };
  }
  const matcha = item.teaBases.includes('matcha');
  const hojicha = item.teaBases.includes('hojicha');
  return {
    name: item.name,
    inspiredBy: item.inspiredBy,
    base:
      matcha && hojicha ? 'both' : matcha ? 'matcha' : hojicha ? 'hojicha' : '',
    price: String(item.price),
    description: item.description,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    isAvailable: item.isAvailable,
    isRecommended: item.isRecommended,
    isFeatured: item.isFeatured,
    isSeasonal: item.isSeasonal,
  };
}

function teaBasesFor(base: Base): string[] {
  if (base === 'both') return ['matcha', 'hojicha'];
  return base ? [base] : [];
}

function toInput(values: FormValues): MenuItemInput {
  return {
    name: values.name.trim(),
    inspiredBy: values.inspiredBy.trim(),
    teaBases: teaBasesFor(values.base),
    price: Number(values.price.trim()),
    description: values.description.trim(),
    imageUrl: values.imageUrl,
    imageAlt: values.imageAlt.trim(),
    isAvailable: values.isAvailable,
    isRecommended: values.isRecommended,
    isFeatured: values.isFeatured,
    isSeasonal: values.isSeasonal,
  };
}

// Only the fields that differ from the saved drink, so edits don't resend everything.
function changedFields(
  input: MenuItemInput,
  item: MenuItem,
): Partial<MenuItemInput> {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(input) as (keyof MenuItemInput)[]) {
    const after = input[key];
    const before = item[key];
    const same =
      Array.isArray(after) && Array.isArray(before)
        ? [...after].sort().join() === [...before].sort().join()
        : after === (typeof before === 'string' ? before.trim() : before);
    if (!same) changes[key] = after;
  }
  // The API keeps the old description if it's left out, so a new photo always
  // goes with the reviewed description.
  if ('imageUrl' in changes) changes.imageAlt = input.imageAlt;
  return changes as Partial<MenuItemInput>;
}

function validate(
  values: FormValues,
  altReview: AltReview,
): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!values.name.trim()) {
    errors.name = 'Give the drink a name so customers can order it.';
  }
  const price = values.price.trim();
  if (!price) {
    errors.price = 'Enter a price, like 6.50.';
  } else if (!/^(\d+(\.\d*)?|\.\d+)$/.test(price)) {
    errors.price = 'Enter a price of 0 or more using numbers only, like 6.50.';
  }
  if (values.imageUrl && !values.imageAlt.trim()) {
    errors.imageAlt = 'Describe the photo for customers who can’t see it.';
  } else if (altReview === 'needed') {
    errors.imageAlt =
      'You replaced the photo. Update the description, or confirm it still matches the new photo.';
  }
  return errors;
}

export default function MenuItemForm({
  item,
  onClose,
}: {
  item?: MenuItem;
  onClose: () => void;
}) {
  const [initialValues] = useState(() => toValues(item));
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [summaryFields, setSummaryFields] = useState<FieldName[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [localPreview, setLocalPreview] = useState('');
  const [focusSummary, setFocusSummary] = useState(0);
  const [altReview, setAltReview] = useState<AltReview>('none');
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(false);
  const latestAlt = useRef(values.imageAlt);
  latestAlt.current = values.imageAlt;
  const id = useId();

  const isEdit = item !== undefined;
  const errors = submitted ? validate(values, altReview) : {};
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const previewSrc = localPreview || values.imageUrl;
  // A photo without a description falls back to the drink's name (API handoff, PR #70).
  const previewAlt =
    values.imageAlt.trim() || values.name.trim() || item?.name || '';
  const fieldId = (name: string) => `${id}-${name}`;

  // The form opens beside (or in place of) the list, so move focus to it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (focusSummary > 0) summaryRef.current?.focus();
  }, [focusSummary]);

  // Free the temporary preview of a photo that's uploading.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // Lists the hint and error that belong to a field, for aria-describedby.
  function describedBy(name: string, hasHint: boolean, error?: string) {
    const ids = [
      hasHint && `${fieldId(name)}-hint`,
      error && `${fieldId(name)}-error`,
    ];
    return ids.filter(Boolean).join(' ') || undefined;
  }

  function confirmLeave() {
    return (
      !dirty ||
      window.confirm('You have unsaved changes. Leave without saving them?')
    );
  }

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setPhotoError('');

    let message = '';
    if (!PHOTO_TYPES.includes(file.type)) message = PHOTO_TYPE_ERROR;
    else if (file.size > MAX_PHOTO_BYTES) message = PHOTO_SIZE_ERROR;
    if (message) {
      setPhotoError(message);
      input.value = '';
      return;
    }

    const replacing = values.imageUrl !== '';
    setUploading(true);
    if (typeof URL.createObjectURL === 'function') {
      setLocalPreview(URL.createObjectURL(file));
    }
    try {
      set('imageUrl', await uploadMenuImage(file));
      // The existing description was written for the old photo, so ask for a review.
      setAltReview(replacing && latestAlt.current.trim() ? 'needed' : 'none');
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setPhotoError(
        status === 415
          ? PHOTO_TYPE_ERROR
          : status === 413
            ? PHOTO_SIZE_ERROR
            : PHOTO_UPLOAD_ERROR,
      );
      input.value = '';
    } finally {
      setUploading(false);
      setLocalPreview('');
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingRef.current || uploading) return;
    setSubmitted(true);
    setSaveError('');

    const fields = Object.keys(validate(values, altReview)) as FieldName[];
    setSummaryFields(fields);
    if (fields.length > 0) {
      setFocusSummary((n) => n + 1);
      return;
    }

    const input = toInput(values);
    const changes = item ? changedFields(input, item) : input;
    if (item && Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      if (item) await updateMenuItem(item._id, changes);
      else await createMenuItem(input);
      onClose();
    } catch {
      savingRef.current = false;
      setSaving(false);
      setSaveError(
        'Couldn’t save the drink. Everything you entered is still here, so please try again.',
      );
      setFocusSummary((n) => n + 1);
    }
  }

  const checkboxes: { key: keyof FormValues; label: string }[] = [
    { key: 'isAvailable', label: 'On the menu' },
    { key: 'isRecommended', label: 'Recommended badge' },
    { key: 'isFeatured', label: 'Feature on home' },
    { key: 'isSeasonal', label: 'Seasonal' },
  ];

  return (
    <div className="flex max-w-lg flex-col gap-5">
      <Link
        to="/admin"
        onClick={(e) => {
          e.preventDefault();
          if (confirmLeave()) onClose();
        }}
        className={`self-start font-mono text-[12px] tracking-[0.08em] text-[#1a1a1a] uppercase underline md:text-[13px] ${focusRing}`}
      >
        ← Back to the list
      </Link>

      <div className="flex flex-col gap-1.5">
        {isEdit ? (
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="flex flex-col gap-1.5 text-[36px] leading-10 font-normal tracking-[-0.02em] text-[#1a1a1a] outline-none md:text-[40px]"
          >
            <span className={`text-[#4a4a4a] ${smallLabel} tracking-[0.08em]`}>
              Editing
            </span>{' '}
            {item.name}
          </h2>
        ) : (
          <>
            <p className={`text-[#4a4a4a] ${smallLabel}`}>New drink</p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-[36px] leading-10 font-normal tracking-[-0.02em] text-[#1a1a1a] outline-none md:text-[40px]"
            >
              Add a drink
            </h2>
          </>
        )}
        <p className={hint}>Drink name and price are required.</p>
      </div>

      {(summaryFields.length > 0 || saveError) && (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="border-2 border-[#b42318] bg-[#fff5f0] px-4 py-3.5 text-[16px] leading-6 text-[#1a1a1a] outline-none"
        >
          {saveError ? (
            <p>{saveError}</p>
          ) : (
            <>
              <p>
                Fix the {summaryFields.length} highlighted{' '}
                {summaryFields.length === 1 ? 'field' : 'fields'}, then{' '}
                {isEdit ? 'save again' : 'add the drink again'}.
              </p>
              <ul className="mt-2 list-disc pl-5">
                {summaryFields.map((name) => (
                  <li key={name}>
                    <a
                      href={`#${fieldId(name)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(fieldId(name))?.focus();
                      }}
                      className={`text-[#b42318] underline ${focusRing}`}
                    >
                      {FIELD_LABELS[name]}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('name')} className={smallLabel}>
            Drink name (required)
          </label>
          <input
            id={fieldId('name')}
            type="text"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Matcha Blossom Trail"
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy('name', false, errors.name)}
            className={textInput(Boolean(errors.name))}
          />
          {errors.name && (
            <p id={`${fieldId('name')}-error`} className={errorText}>
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('inspiredBy')} className={smallLabel}>
            Inspired by (optional)
          </label>
          <input
            id={fieldId('inspiredBy')}
            type="text"
            value={values.inspiredBy}
            onChange={(e) => set('inspiredBy', e.target.value)}
            placeholder="e.g. Banana bread"
            className={textInput(false)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('base')} className={smallLabel}>
            Base
          </label>
          <select
            id={fieldId('base')}
            value={values.base}
            onChange={(e) => set('base', e.target.value as Base)}
            className={`min-h-12 ${textInput(false)}`}
          >
            <option value="">Not specified</option>
            <option value="matcha">Matcha</option>
            <option value="hojicha">Hojicha</option>
            <option value="both">Matcha or Hojicha</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('price')} className={smallLabel}>
            Price (required)
          </label>
          <div
            className={`flex min-h-12 items-center gap-2 px-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1a1a1a] ${inputBox(Boolean(errors.price))}`}
          >
            <span aria-hidden="true" className="text-[16px] text-[#4a4a4a]">
              $
            </span>
            <input
              id={fieldId('price')}
              type="text"
              inputMode="decimal"
              value={values.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="0.00"
              aria-required="true"
              aria-invalid={errors.price ? true : undefined}
              aria-describedby={describedBy('price', true, errors.price)}
              className="min-w-0 flex-1 bg-transparent py-3 text-[16px] leading-[22px] text-[#1a1a1a] outline-none placeholder:text-[#595959]"
            />
          </div>
          {errors.price && (
            <p id={`${fieldId('price')}-error`} className={errorText}>
              {errors.price}
            </p>
          )}
          <p id={`${fieldId('price')}-hint`} className={hint}>
            In dollars. Not shown on the public menu for now.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('description')} className={smallLabel}>
            What’s in it
          </label>
          <textarea
            id={fieldId('description')}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="e.g. Whole milk / Montblanc foam"
            rows={3}
            aria-describedby={describedBy('description', true)}
            className={`min-h-24 ${textInput(false)}`}
          />
          <p id={`${fieldId('description')}-hint`} className={hint}>
            Separate ingredients with a slash ( / ), like the printed menu.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('photo')} className={smallLabel}>
            Photo
          </label>
          {previewSrc && (
            <div className="flex h-40 w-32 items-center justify-center bg-[#f4f4f4]">
              <img
                src={previewSrc}
                alt={previewAlt}
                className="size-full object-contain p-2"
              />
            </div>
          )}
          <input
            id={fieldId('photo')}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            disabled={uploading}
            onChange={(e) => void handlePhoto(e)}
            aria-invalid={photoError ? true : undefined}
            aria-describedby={describedBy('photo', true, photoError)}
            className={`text-[15px] text-[#4a4a4a] file:mr-2.5 file:border file:border-[#1a1a1a] file:bg-white file:px-3 file:py-1.5 file:text-[15px] file:text-[#1a1a1a] disabled:opacity-60 ${focusRing}`}
          />
          {uploading && (
            <p role="status" className={hint}>
              Uploading photo…
            </p>
          )}
          {photoError && (
            <p
              id={`${fieldId('photo')}-error`}
              role="alert"
              className={errorText}
            >
              {photoError}
            </p>
          )}
          <p id={`${fieldId('photo')}-hint`} className={hint}>
            {previewSrc && !uploading
              ? 'Choose a new file to replace this photo. '
              : ''}
            JPG, PNG or WebP, up to 5 MB. A cut-out drink photo on a plain
            background looks best on the menu tiles.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('imageAlt')} className={smallLabel}>
            Describe the photo (required if there’s a photo)
          </label>
          <textarea
            id={fieldId('imageAlt')}
            value={values.imageAlt}
            onChange={(e) => {
              set('imageAlt', e.target.value);
              setAltReview('none');
            }}
            placeholder="e.g. Iced matcha over orange milk with whipped foam"
            rows={3}
            aria-required={values.imageUrl ? true : undefined}
            aria-invalid={errors.imageAlt ? true : undefined}
            aria-describedby={describedBy('imageAlt', true, errors.imageAlt)}
            className={`min-h-24 ${textInput(Boolean(errors.imageAlt))}`}
          />
          {errors.imageAlt && (
            <p id={`${fieldId('imageAlt')}-error`} className={errorText}>
              {errors.imageAlt}
            </p>
          )}
          {altReview !== 'none' && (
            <label className="flex min-h-11 items-center gap-2.5 text-[14px] leading-5 text-[#1a1a1a]">
              <input
                type="checkbox"
                checked={altReview === 'confirmed'}
                onChange={(e) =>
                  setAltReview(e.target.checked ? 'confirmed' : 'needed')
                }
                className={`size-5 shrink-0 accent-[#1a1a1a] ${focusRing}`}
              />
              This description still matches the new photo
            </label>
          )}
          <p id={`${fieldId('imageAlt')}-hint`} className={hint}>
            Screen readers read this aloud for customers who can’t see the
            photo.
          </p>
        </div>

        <fieldset className="flex flex-col border border-[#1a1a1a] px-3.5 py-2.5 md:px-4 md:py-3">
          <legend className={`px-1 text-[#1a1a1a] ${smallLabel}`}>
            Show it
          </legend>
          {checkboxes.map(({ key, label }) => (
            <label
              key={key}
              className="flex min-h-11 items-center gap-2.5 font-mono text-[12px] tracking-[0.06em] text-[#1a1a1a] uppercase md:text-[13px]"
            >
              <input
                type="checkbox"
                checked={values[key] as boolean}
                onChange={(e) => set(key, e.target.checked)}
                className={`size-5 shrink-0 accent-[#1a1a1a] ${focusRing}`}
              />
              {label}
            </label>
          ))}
        </fieldset>

        {/* How the menu tile will look. Display only: nothing in it is focusable. */}
        <section
          aria-labelledby={fieldId('preview')}
          className="flex flex-col gap-2.5"
        >
          <h3
            id={fieldId('preview')}
            className={`font-normal text-[#4a4a4a] ${smallLabel}`}
          >
            Preview
          </h3>
          <div className="flex w-[220px] flex-col gap-1.5 border border-[#e4e4e4] bg-white p-3 xl:border-0">
            <div className="relative mb-1 flex h-[245px] items-center justify-center overflow-hidden bg-[#f4f4f4]">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt={previewAlt}
                  className="h-2/3 w-1/2 object-contain"
                />
              ) : (
                <p className="text-[13px] text-[#595959]">No photo yet</p>
              )}
              {values.isRecommended && (
                <span className="absolute top-2.5 left-2.5 bg-[#1a1a1a] px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-white uppercase">
                  Recommended
                </span>
              )}
            </div>
            <p
              className={`${smallLabel} ${values.name.trim() ? 'text-[#1a1a1a]' : 'text-[#595959]'}`}
            >
              {values.name.trim() || 'Drink name'}
            </p>
            {values.description.trim() && (
              <p className="text-[13px] leading-[18px] text-[#4a4a4a]">
                {values.description.trim()}
              </p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="submit"
            disabled={saving || uploading}
            className={`${button} border-[#1a1a1a] bg-[#1a1a1a] text-white`}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to menu'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmLeave()) onClose();
            }}
            className={`${button} border-[#1a1a1a] bg-white text-[#1a1a1a]`}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
