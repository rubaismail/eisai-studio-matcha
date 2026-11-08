import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { register } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  confirmPasswordError,
  emailError,
  newPasswordError,
} from '../auth/validation';
import AccountLayout from '../components/AccountLayout';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import { focusRing, primaryButton } from '../components/styles';

type Field = 'firstName' | 'lastName' | 'email' | 'password' | 'confirm';
const FIELD_ORDER: Field[] = [
  'firstName',
  'lastName',
  'email',
  'password',
  'confirm',
];

type Problem = 'none' | 'duplicate' | 'invalid' | 'rate-limited' | 'failed';

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Field, string>>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<Problem>('none');
  const [submitting, setSubmitting] = useState(false);
  // Blocks repeat submits at once; `submitting` only updates on the next render.
  const inFlight = useRef(false);
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  if (user && !submitting) {
    return (
      <Navigate to={user.role === 'admin' ? '/admin' : '/account'} replace />
    );
  }

  function field(name: Field) {
    return {
      ref: (el: HTMLInputElement | null) => {
        refs.current[name] = el;
      },
      name,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setValues((current) => ({ ...current, [name]: e.target.value })),
      error: errors[name],
    };
  }

  function validate() {
    const next: Partial<Record<Field, string>> = {
      firstName: values.firstName.trim() ? undefined : 'Enter your first name.',
      lastName: values.lastName.trim() ? undefined : 'Enter your last name.',
      email: emailError(values.email),
      password: newPasswordError(values.password),
      confirm: confirmPasswordError(values.password, values.confirm),
    };
    setErrors(next);
    const firstInvalid = FIELD_ORDER.find((name) => next[name]);
    if (firstInvalid) refs.current[firstInvalid]?.focus();
    return !firstInvalid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setProblem('none');
    if (!validate()) return;

    inFlight.current = true;
    setSubmitting(true);
    const email = values.email.trim();
    try {
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email,
        password: values.password,
      });
      navigate('/check-email', {
        replace: true,
        state: { email: email.toLowerCase() },
      });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) {
        setProblem('duplicate');
        refs.current.email?.focus();
      } else if (status === 400) setProblem('invalid');
      else if (status === 429) setProblem('rate-limited');
      else setProblem('failed');
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const duplicateError = (
    <>
      An account with this email already exists.{' '}
      <Link
        to="/login"
        className={`underline underline-offset-2 hover:no-underline ${focusRing}`}
      >
        Log in instead
      </Link>
      .
    </>
  );

  return (
    <AccountLayout
      title="Create account"
      intro="Get started with your Eisai account."
    >
      {problem === 'invalid' && (
        <Notice tone="error">
          Some details weren’t accepted. Check the form and try again.
        </Notice>
      )}
      {problem === 'rate-limited' && (
        <Notice tone="error">
          Too many sign-up attempts. Please wait a few minutes and try again.
        </Notice>
      )}
      {problem === 'failed' && (
        <Notice tone="error">
          Something went wrong on our end. Please try again in a moment.
        </Notice>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-[18px] md:gap-5"
      >
        <div className="flex flex-col gap-[18px] sm:flex-row sm:gap-4 [&>*]:flex-1">
          <TextField
            label="First name"
            autoComplete="given-name"
            placeholder="First"
            {...field('firstName')}
          />
          <TextField
            label="Last name"
            autoComplete="family-name"
            placeholder="Last"
            {...field('lastName')}
          />
        </div>
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...field('email')}
          error={
            errors.email ??
            (problem === 'duplicate' ? duplicateError : undefined)
          }
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...field('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          {...field('confirm')}
        />
        <button
          type="submit"
          disabled={submitting}
          className={`w-full ${primaryButton}`}
        >
          {submitting ? 'Creating account…' : 'Create account →'}
        </button>
        <p className="text-[14px] leading-[21px] text-ink-muted">
          We’ll email you a link to verify your address before you log in.
        </p>
      </form>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink pt-5 md:pt-6">
        <span className="text-[16px] md:text-[17px]">
          Already have an account?
        </span>
        <Link
          to="/login"
          className={`font-mono text-[13px] tracking-[0.08em] uppercase underline underline-offset-2 hover:no-underline md:text-[14px] ${focusRing}`}
        >
          Log in
        </Link>
      </p>
    </AccountLayout>
  );
}
