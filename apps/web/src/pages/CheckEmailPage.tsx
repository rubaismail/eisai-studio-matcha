import { Link, useLocation } from 'react-router';
import { useResendVerification } from '../auth/useResendVerification';
import AccountLayout from '../components/AccountLayout';
import ResendStatusMessage from '../components/ResendStatusMessage';
import ResendVerificationForm from '../components/ResendVerificationForm';
import { primaryButton, secondaryButton } from '../components/styles';

// Shown after sign-up. The address comes from the register page; without it
// (e.g. opened directly) the page asks for it before resending.
export default function CheckEmailPage() {
  const state = useLocation().state as { email?: unknown } | null;
  const email = typeof state?.email === 'string' ? state.email : null;
  const { status, secondsLeft, send } = useResendVerification();

  return (
    <AccountLayout title="Check your inbox">
      {email ? (
        <>
          <div className="flex flex-col items-start gap-4">
            <p className="text-[17px]">We sent a verification email to</p>
            <p className="bg-lavender px-1.5 py-0.5 text-[17px] break-all">
              {email}
            </p>
            <p className="text-[17px] leading-[27px] text-ink-muted">
              Open the link in your email to verify your address. Once your
              email is verified, come back here and log in.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void send(email)}
              disabled={status === 'sending' || secondsLeft > 0}
              className={primaryButton}
            >
              {status === 'sending' ? 'Sending…' : 'Resend email'}
            </button>
            <Link to="/login" className={secondaryButton}>
              ← Back to login
            </Link>
          </div>
          <ResendStatusMessage status={status} secondsLeft={secondsLeft} />
        </>
      ) : (
        <>
          <p className="text-[17px] leading-[27px] text-ink-muted">
            Open the link in your email to verify your address, then log in.
            Didn’t get it? Enter your email and we’ll send a new link.
          </p>
          <ResendVerificationForm />
          <Link to="/login" className={`self-start ${secondaryButton}`}>
            ← Back to login
          </Link>
        </>
      )}
      <p className="text-[14px] text-ink-muted">
        Can’t find it? Check your spam or junk folder.
      </p>
    </AccountLayout>
  );
}
