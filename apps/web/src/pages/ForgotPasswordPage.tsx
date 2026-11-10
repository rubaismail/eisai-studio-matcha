import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { forgotPassword } from '../api/auth';
import { useSendCooldown } from '../auth/useSendCooldown';
import { emailError } from '../auth/validation';
import AccountLayout from '../components/AccountLayout';
import ResendStatusMessage from '../components/ResendStatusMessage';
import type { ResendMessages } from '../components/ResendStatusMessage';
import TextField from '../components/TextField';
import {
  primaryButton,
  secondaryButton,
  switchLink,
} from '../components/styles';

export interface ForgotPasswordState {
  // Prefill, e.g. from My account.
  email?: unknown;
  // Set after sending, so a reload keeps "Check your inbox."
  sentTo?: unknown;
  sentAt?: unknown;
}

const messages: ResendMessages = {
  sent: 'If an account exists, a new reset link is on its way.',
  'rate-limited': 'You’ve asked for several links already.',
  failed: 'Couldn’t send a reset link. Please try again.',
};

export default function ForgotPasswordPage() {
  const state = useLocation().state as ForgotPasswordState | null;
  const email = typeof state?.email === 'string' ? state.email : '';
  const sentTo = typeof state?.sentTo === 'string' ? state.sentTo : null;
  const sentAt = typeof state?.sentAt === 'number' ? state.sentAt : null;

  return (
    <>
      <p role="status" className="sr-only">
        {sentTo
          ? 'Check your inbox. If an account exists, we’ll email a reset link.'
          : ''}
      </p>
      {sentTo ? (
        <LinkSent key={`${sentTo}-${sentAt}`} email={sentTo} sentAt={sentAt} />
      ) : (
        <RequestForm initialEmail={email} sentAt={sentAt} />
      )}
    </>
  );
}

function RequestForm({
  initialEmail,
  sentAt,
}: {
  initialEmail: string;
  sentAt: number | null;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string>();
  const emailRef = useRef<HTMLInputElement>(null);
  // Back keeps the one-minute wait.
  const request = useSendCooldown(
    forgotPassword,
    sentAt === null ? undefined : { email: initialEmail, at: sentAt },
  );
  const sent = request.status(email) === 'sent';
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = emailError(email);
    setError(problem);
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    const result = await request.send(email);
    // They may have left the page while it was sending.
    if (result !== 'sent' || !mounted.current) return;
    const now = Date.now();
    // So Back shows the form with the address filled in.
    const form: ForgotPasswordState = { email, sentAt: now };
    await navigate('/forgot-password', { replace: true, state: form });
    const sent: ForgotPasswordState = { sentTo: email.trim(), sentAt: now };
    await navigate('/forgot-password', { state: sent });
  }

  return (
    <AccountLayout
      title="Forgot password?"
      intro="Enter your account email and we’ll send you a link to reset your password."
      titleSize="md"
    >
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
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <button
          type="submit"
          disabled={request.blocked(email)}
          className={`w-full ${primaryButton}`}
        >
          {request.status(email) === 'sending'
            ? 'Sending…'
            : 'Send reset link →'}
        </button>
        {/* Errors only */}
        <ResendStatusMessage
          status={sent ? 'idle' : request.status(email)}
          secondsLeft={sent ? 0 : request.secondsLeft(email)}
          messages={messages}
        />
      </form>
      <Link to="/login" className={`self-start ${switchLink}`}>
        ← Back to login
      </Link>
    </AccountLayout>
  );
}

function LinkSent({ email, sentAt }: { email: string; sentAt: number | null }) {
  const resend = useSendCooldown(
    forgotPassword,
    sentAt === null ? undefined : { email, at: sentAt },
  );

  return (
    <AccountLayout
      eyebrow="Password reset"
      title="Check your inbox."
      intro="If an account exists, we’ll email a reset link."
      titleSize="md"
    >
      <p className="bg-lavender px-4 py-3.5 text-[16px] leading-[25px] md:px-5 md:py-[18px] md:leading-6">
        After resetting your password, come back here and log in. If the link
        expired, request a new one.
      </p>
      <div className="flex flex-col gap-[22px] sm:flex-row sm:gap-3">
        <button
          type="button"
          onClick={() => void resend.send(email)}
          disabled={resend.blocked(email)}
          className={primaryButton}
        >
          {resend.status(email) === 'sending'
            ? 'Sending…'
            : 'Resend reset link'}
        </button>
        <Link to="/login" className={secondaryButton}>
          ← Back to login
        </Link>
      </div>
      <ResendStatusMessage
        status={resend.status(email)}
        secondsLeft={resend.secondsLeft(email)}
        messages={messages}
      />
      <p className="text-[14px] leading-[21px] text-ink-muted">
        Can’t find it? Check your spam or junk folder.
      </p>
    </AccountLayout>
  );
}
