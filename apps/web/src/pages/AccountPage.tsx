import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import AccountLayout from '../components/AccountLayout';
import { label, primaryButton, secondaryButton } from '../components/styles';

// Email only: login returns no name and there's no profile endpoint.
export default function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  function handleLogOut() {
    signOut();
    navigate('/', { replace: true });
  }

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
        onClick={handleLogOut}
        className={`w-full ${primaryButton}`}
      >
        Log out
      </button>
    </AccountLayout>
  );
}
