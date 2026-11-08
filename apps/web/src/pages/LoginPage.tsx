import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useResendVerification } from '../auth/useResendVerification';
import { emailError } from '../auth/validation';
import type { LoginRedirectState } from '../auth/guards';
import AccountLayout from '../components/AccountLayout';
import Notice from '../components/Notice';
import ResendStatusMessage from '../components/ResendStatusMessage';
import TextField from '../components/TextField';
import { primaryButton, switchLink, textLink } from '../components/styles';

// The API's rate limit window.
const DEFAULT_LOCKOUT_SECONDS = 15 * 60;

type Problem =
  | { kind: 'none' }
  | { kind: 'incorrect' } // 401
  | { kind: 'unverified'; email: string } // 403
  | { kind: 'rate-limited'; minutes: number } // 429
  | { kind: 'failed' }; // network or server error

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = (location.state ?? {}) as LoginRedirectState;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [problem, setProblem] = useState<Problem>({ kind: 'none' });
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  // Blocks repeat submits at once; `submitting` only updates on the next render.
  const inFlight = useRef(false);
  const resend = useResendVerification();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

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

  // Already signed in.
  if (user && !submitting) {
    const home = user.role === 'admin' ? '/admin' : '/account';
    return <Navigate to={redirect.from ?? home} replace />;
  }

  // Only when a guard sent them here.
  const showExpired = redirect.expired && problem.kind === 'none';
  const fromAdmin = redirect.from?.startsWith('/admin');

  function validate() {
    const errors: typeof fieldErrors = {};
    errors.email = emailError(email);
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
    return !errors.email && !errors.password;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || lockedUntil !== null) return;
    setProblem({ kind: 'none' });
    if (!validate()) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      const session = await login(email, password);
      signIn(session);
      const fallback = session.user.role === 'admin' ? '/admin' : '/account';
      navigate(redirect.from ?? fallback, { replace: true });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 401) setProblem({ kind: 'incorrect' });
      else if (status === 403)
        setProblem({ kind: 'unverified', email: email.trim() });
      else if (status === 429) {
        const seconds =
          (err instanceof ApiError && err.retryAfterSeconds) ||
          DEFAULT_LOCKOUT_SECONDS;
        setLockedUntil(Date.now() + seconds * 1000);
        setProblem({ kind: 'rate-limited', minutes: Math.ceil(seconds / 60) });
      } else setProblem({ kind: 'failed' });
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const incorrect = problem.kind === 'incorrect';
  const unverified = problem.kind === 'unverified';
  const locked = lockedUntil !== null;

  return (
    <AccountLayout title="Welcome back!" intro="Sign in to your account">
      {showExpired && (
        <Notice tone="info">
          {fromAdmin
            ? 'Your session expired. Log in again to keep editing the menu.'
            : 'Your session expired. Please log in again.'}
        </Notice>
      )}
      {incorrect && (
        <Notice tone="error">
          Email or password is incorrect. Please try again.
        </Notice>
      )}
      {problem.kind === 'rate-limited' && (
        <Notice tone="error">
          Too many login attempts. Please wait and try again later.
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
          ref={emailRef}
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={
            fieldErrors.email ??
            (unverified ? 'Please verify your email to log in.' : undefined)
          }
          invalid={incorrect}
        />

        {problem.kind === 'unverified' && (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[21px] text-ink-muted">
              Check your inbox for the verification link.
            </p>
            {/* Hidden once sent; the status line below takes its place. */}
            {resend.status(problem.email) !== 'sent' && (
              <button
                type="button"
                onClick={() => void resend.send(problem.email)}
                disabled={resend.blocked(problem.email)}
                className={`self-start text-left disabled:opacity-60 ${textLink}`}
              >
                {resend.status(problem.email) === 'sending'
                  ? 'Sending a new link…'
                  : 'No email? Request a new verification link →'}
              </button>
            )}
            <ResendStatusMessage
              status={resend.status(problem.email)}
              secondsLeft={resend.secondsLeft(problem.email)}
            />
          </div>
        )}

        <TextField
          ref={passwordRef}
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          invalid={incorrect}
        />

        <Link to="/forgot-password" className={`self-start ${textLink}`}>
          Forgot password?
        </Link>

        <button
          type="submit"
          disabled={submitting || locked}
          className={`w-full ${primaryButton}`}
        >
          {submitting
            ? 'Logging in…'
            : incorrect
              ? 'Try logging in →'
              : 'Log in →'}
        </button>
        {problem.kind === 'rate-limited' && (
          <p className="text-[14px] leading-[21px] text-ink-muted">
            You can try again in {problem.minutes}{' '}
            {problem.minutes === 1 ? 'minute' : 'minutes'}.
          </p>
        )}
      </form>

      <div className="flex flex-col gap-2.5 border-t border-ink pt-5 md:gap-3 md:pt-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[16px] md:text-[17px]">New to Eisai?</span>
          <Link to="/register" className={switchLink}>
            Create account →
          </Link>
        </p>
        <p className="text-[14px] leading-[21px] text-ink-muted">
          New accounts verify their email before logging in.
        </p>
      </div>
    </AccountLayout>
  );
}
