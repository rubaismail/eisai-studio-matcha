import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { verifyEmail } from '../api/auth';
import { ApiError } from '../api/client';
import spinner from '../assets/spinner.svg';
import AccountLayout from '../components/AccountLayout';
import ResendVerificationForm from '../components/ResendVerificationForm';
import { primaryButton, secondaryButton, textLink } from '../components/styles';

type Result = 'verified' | 'expired';
type Status = 'checking' | Result | 'error';

// Tokens are single-use, so each one is sent once even if React runs the
// effect twice (development mode) or the page remounts.
const requests = new Map<string, Promise<void>>();
function verifyOnce(token: string): Promise<void> {
  let request = requests.get(token);
  if (!request) {
    request = verifyEmail(token).then(() => undefined);
    requests.set(token, request);
  }
  return request;
}

const announcements: Record<Status, string> = {
  checking: 'Checking your verification link.',
  verified: 'Email verified. You can now log in.',
  expired: 'This verification link is invalid, expired or already used.',
  error: 'We couldn’t check your verification link.',
};

// Opened from the verification email: /verify-email?token=...
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  // After checking, the result moves into history state and the token leaves
  // the address bar, so a reload shows the result instead of re-sending it.
  const savedResult = (location.state as { verifyResult?: Result } | null)
    ?.verifyResult;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const status: Status =
    savedResult ?? (!token ? 'expired' : failed ? 'error' : 'checking');

  useEffect(() => {
    if (savedResult || !token) return;
    let active = true;
    verifyOnce(token)
      .then(() => {
        if (active) showResult('verified');
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 400) {
          showResult('expired');
        } else {
          // Let "Try again" send the same token again.
          requests.delete(token);
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };

    function showResult(result: Result) {
      navigate(
        { pathname: '/verify-email' },
        { replace: true, state: { verifyResult: result } },
      );
    }
  }, [token, savedResult, attempt, navigate]);

  function retry() {
    setFailed(false);
    setAttempt((n) => n + 1);
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announcements[status]}
      </p>
      {status === 'checking' && (
        <AccountLayout eyebrow="Email verification" title="Checking your email">
          <img
            src={spinner}
            alt=""
            width={44}
            height={44}
            className="animate-spin motion-reduce:animate-none"
          />
          <div className="flex flex-col gap-2.5 text-[17px] leading-[26px]">
            <p>Your verification link is open.</p>
            <p className="text-ink-muted">
              Please wait while we verify your email address.
            </p>
          </div>
          <p className="text-[14px] leading-[21px] text-ink-muted">
            When verification is complete, you can log in. Verifying doesn’t
            sign you in automatically.
          </p>
        </AccountLayout>
      )}

      {status === 'verified' && (
        <AccountLayout eyebrow="Email verification" title="Email verified">
          <p className="text-[17px] leading-[26px]">
            Your email is verified. You can now log in to your Eisai account.
          </p>
          <Link to="/login" className={`w-full ${primaryButton}`}>
            Log in →
          </Link>
          <p className="text-[14px] leading-[21px] text-ink-muted">
            You’re not logged in yet. Enter your email and password on the login
            screen.
          </p>
        </AccountLayout>
      )}

      {status === 'expired' && (
        <AccountLayout
          eyebrow="Email verification"
          title="Link expired"
          intro="This verification link is invalid, expired or already used. Enter your email and we’ll send a new one."
        >
          <ResendVerificationForm />
          <Link to="/login" className={`self-start ${textLink}`}>
            ← Back to login
          </Link>
        </AccountLayout>
      )}

      {status === 'error' && (
        <AccountLayout
          eyebrow="Email verification"
          title="Something went wrong"
          intro="We couldn’t check your verification link right now. Please try again in a moment."
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={retry} className={primaryButton}>
              Try again
            </button>
            <Link to="/login" className={secondaryButton}>
              ← Back to login
            </Link>
          </div>
        </AccountLayout>
      )}
    </>
  );
}
