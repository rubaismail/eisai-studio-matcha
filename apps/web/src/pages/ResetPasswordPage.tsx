import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { confirmPasswordError, newPasswordError } from '../auth/validation';
import AccountLayout from '../components/AccountLayout';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import { primaryButton, switchLink } from '../components/styles';

type Result = 'updated' | 'expired';

interface ResetState {
  resetToken?: unknown;
  resetResult?: unknown;
}

type Problem =
  | { kind: 'none' }
  | { kind: 'rate-limited'; minutes: number } // 429
  | { kind: 'failed' }; // network or server error

// The API's rate limit window.
const DEFAULT_LOCKOUT_SECONDS = 15 * 60;

const announcements: Record<Result, string> = {
  updated: 'Password updated. You can now log in with your new password.',
  expired: 'This reset link is invalid, expired or already used.',
};

// Opened from the reset email: /reset-password?token=...
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResetState | null;
  const urlToken = searchParams.get('token') || null;
  const token =
    urlToken ??
    (typeof state?.resetToken === 'string' ? state.resetToken : null);
  const savedResult =
    state?.resetResult === 'updated' || state?.resetResult === 'expired'
      ? state.resetResult
      : null;

  // Take the token out of the address bar; history state keeps it for reloads.
  useEffect(() => {
    if (!urlToken) return;
    const next: ResetState = { resetToken: urlToken };
    void navigate('/reset-password', { replace: true, state: next });
  }, [urlToken, navigate]);

  const result: Result | null = savedResult ?? (token ? null : 'expired');

  function showResult(next: Result) {
    const resultState: ResetState = { resetResult: next };
    void navigate('/reset-password', { replace: true, state: resultState });
  }

  return (
    <>
      <p role="status" className="sr-only">
        {result ? announcements[result] : ''}
      </p>
      {result === 'updated' && (
        <AccountLayout
          eyebrow="Reset your password"
          title="Password updated"
          intro="Your password has been reset successfully."
          titleSize="md"
        >
          <Link to="/login" className={`w-full ${primaryButton}`}>
            Go to log in →
          </Link>
          <p className="text-[14px] leading-[21px] text-ink-muted">
            Updating your password doesn’t log you in automatically. Your next
            step is the login screen.
          </p>
        </AccountLayout>
      )}
      {result === 'expired' && (
        <AccountLayout
          eyebrow="Reset your password"
          title="Link expired"
          intro="This reset link is invalid, expired or already used. Request a new one to continue."
          titleSize="md"
        >
          <Link to="/forgot-password" className={`w-full ${primaryButton}`}>
            Request a new link →
          </Link>
          <Link to="/login" className={`self-start ${switchLink}`}>
            ← Back to login
          </Link>
        </AccountLayout>
      )}
      {!result && token && <ResetForm token={token} onResult={showResult} />}
    </>
  );
}

function ResetForm({
  token,
  onResult,
}: {
  token: string;
  onResult: (result: Result) => void;
}) {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [problem, setProblem] = useState<Problem>({ kind: 'none' });
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  // Blocks repeat submits at once; `submitting` only updates on the next render.
  const inFlight = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setTimeout(
      () => {
        setLockedUntil(null);
        setProblem({ kind: 'none' });
      },
      Math.max(0, lockedUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  function validate() {
    const next = {
      password: newPasswordError(password),
      confirm: confirmPasswordError(password, confirm),
    };
    setErrors(next);
    if (next.password) passwordRef.current?.focus();
    else if (next.confirm) confirmRef.current?.focus();
    return !next.password && !next.confirm;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || lockedUntil !== null) return;
    setProblem({ kind: 'none' });
    if (!validate()) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      // End the old session so they log in with the new password.
      if (user) signOut();
      // Don't replace another page if they left.
      if (mounted.current) onResult('updated');
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 400) {
        if (mounted.current) onResult('expired');
        return;
      }
      if (status === 429) {
        const seconds =
          (err instanceof ApiError && err.retryAfterSeconds) ||
          DEFAULT_LOCKOUT_SECONDS;
        setLockedUntil(Date.now() + seconds * 1000);
        setProblem({ kind: 'rate-limited', minutes: Math.ceil(seconds / 60) });
      } else {
        setProblem({ kind: 'failed' });
      }
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AccountLayout
      eyebrow="Reset your password"
      title="New password"
      intro="Choose a new password for your account."
      titleSize="md"
    >
      {problem.kind === 'rate-limited' && (
        <Notice tone="error">
          Too many reset attempts. Please wait and try again later.
        </Notice>
      )}
      {problem.kind === 'failed' && (
        <Notice tone="error">
          Something went wrong on our end. Please try again in a moment.
        </Notice>
      )}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-[18px] md:gap-5"
      >
        <TextField
          ref={passwordRef}
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          hint="At least 8 characters."
          error={errors.password}
        />
        <TextField
          ref={confirmRef}
          label="Confirm new password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setErrors((current) => ({ ...current, confirm: undefined }));
          }}
          error={errors.confirm}
        />
        <button
          type="submit"
          disabled={submitting || lockedUntil !== null}
          className={`w-full ${primaryButton}`}
        >
          {submitting ? 'Resetting…' : 'Reset password →'}
        </button>
        {problem.kind === 'rate-limited' ? (
          <p className="text-[14px] leading-[21px] text-ink-muted">
            You can try again in {problem.minutes}{' '}
            {problem.minutes === 1 ? 'minute' : 'minutes'}.
          </p>
        ) : (
          <p className="text-[14px] leading-[21px] text-ink-muted">
            Once your password is updated, you’ll log in with it.
          </p>
        )}
      </form>
    </AccountLayout>
  );
}
