import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { deleteAccount } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AccountLayout from '../components/AccountLayout';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import {
  focusRing,
  label,
  primaryButton,
  secondaryButton,
} from '../components/styles';

// Destructive buttons: the site's button shape in the error red (6.5:1 on white).
const dangerBase = `inline-flex min-h-12 items-center justify-center border border-error px-7 text-center font-mono text-[14px] tracking-[0.08em] uppercase disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
const dangerButton = `${dangerBase} bg-error text-white`;
const dangerOutlineButton = `${dangerBase} bg-white text-error`;

const GENERIC_ERROR = 'Couldn’t delete your account. Please try again.';

function waitText(seconds: number) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function errorMessage(err: unknown) {
  if (!(err instanceof ApiError)) return GENERIC_ERROR;
  if (err.status === 403)
    return 'Incorrect password. Your account wasn’t deleted.';
  if (err.status === 409) {
    return (
      err.serverMessage ??
      'This is the only admin account, so it can’t be deleted.'
    );
  }
  if (err.status === 429) {
    return err.retryAfterSeconds
      ? `Too many attempts. Please try again in ${waitText(err.retryAfterSeconds)}.`
      : 'Too many attempts. Please try again later.';
  }
  return GENERIC_ERROR;
}

function DeleteAccountSection() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // Kept in memory only, and cleared whenever the step closes.
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Blocks repeat submits at once; `deleting` only updates on the next render.
  const inFlight = useRef(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Where focus goes after the step opens or closes.
  const focusNext = useRef<'step' | 'button' | null>(null);

  useEffect(() => {
    if (focusNext.current === 'step') headingRef.current?.focus();
    if (focusNext.current === 'button') openButtonRef.current?.focus();
    focusNext.current = null;
  }, [open]);

  function openStep() {
    focusNext.current = 'step';
    setOpen(true);
  }

  function close() {
    if (inFlight.current) return;
    setPassword('');
    setFieldError('');
    setError('');
    setWrongPassword(false);
    focusNext.current = 'button';
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError('');
    setWrongPassword(false);
    if (!password) {
      setFieldError('Enter your current password.');
      passwordRef.current?.focus();
      return;
    }

    inFlight.current = true;
    setDeleting(true);
    try {
      await deleteAccount(password);
      // The same sign-out as Log out: AuthProvider clears the session once
      // home is reached. The home page shows the message once.
      navigate('/', { state: { signOut: true, accountDeleted: true } });
      return;
    } catch (err) {
      // 401: the client has already signed out and the guard sends them to log in.
      if (err instanceof ApiError && err.status === 401) return;
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 403) {
        setWrongPassword(true);
        setPassword('');
        passwordRef.current?.focus();
      }
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="delete-heading"
      className="flex flex-col gap-4 border-t border-ink pt-6 md:pt-7"
    >
      <h2 id="delete-heading" className={`${label} text-error`}>
        Delete account
      </h2>
      <p className="text-[14px] leading-[21px] text-ink-muted">
        Permanently delete your Eisai account and the information saved with it.
      </p>
      {!open ? (
        <button
          ref={openButtonRef}
          type="button"
          onClick={openStep}
          className={`w-full ${dangerOutlineButton}`}
        >
          Delete account
        </button>
      ) : (
        <div
          role="group"
          aria-labelledby="delete-step-heading"
          aria-describedby="delete-step-warning"
          onKeyDown={handleKeyDown}
          className="flex flex-col gap-4 border-2 border-error p-5"
        >
          <h3
            ref={headingRef}
            id="delete-step-heading"
            tabIndex={-1}
            className="text-[24px] leading-[30px] text-ink outline-none"
          >
            Delete your account?
          </h3>
          <p
            id="delete-step-warning"
            className="text-[16px] leading-[25px] text-ink"
          >
            This permanently deletes your account and can’t be undone. Enter
            your current password to confirm.
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          <form
            noValidate
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <TextField
              ref={passwordRef}
              label="Current password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldError('');
                setWrongPassword(false);
              }}
              error={fieldError || undefined}
              invalid={wrongPassword}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={deleting}
                className={`sm:flex-1 ${dangerButton}`}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={deleting}
                className={`sm:flex-1 ${secondaryButton}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// Email only: login returns no name and there's no profile endpoint.
export default function AccountPage() {
  const { user, logOut } = useAuth();
  if (!user) return null;

  return (
    <AccountLayout title="My account." intro="Manage your account details.">
      <section
        aria-labelledby="profile-heading"
        className="flex flex-col gap-4 bg-lavender p-6"
      >
        <h2 id="profile-heading" className={`${label} text-ink-muted`}>
          Profile information
        </h2>
        <dl className="flex flex-col gap-1.5">
          <dt className="font-mono text-[12px] tracking-[0.08em] text-ink-muted uppercase">
            Email address
          </dt>
          <dd className="text-[18px] break-all text-ink">{user.email}</dd>
        </dl>
      </section>
      {/* No change-password endpoint, so use the reset email. */}
      <Link
        to="/forgot-password"
        state={{ email: user.email }}
        className={`w-full ${secondaryButton}`}
      >
        Reset password →
      </Link>
      <button
        type="button"
        onClick={logOut}
        className={`w-full ${primaryButton}`}
      >
        Log out
      </button>
      <DeleteAccountSection />
    </AccountLayout>
  );
}
