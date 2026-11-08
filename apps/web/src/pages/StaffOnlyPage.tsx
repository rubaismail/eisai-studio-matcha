import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import AccountLayout from '../components/AccountLayout';
import { primaryButton, secondaryButton } from '../components/styles';

export default function StaffOnlyPage() {
  const { user, signOut } = useAuth();

  return (
    <AccountLayout
      eyebrow="Staff · Menu editor"
      title="Staff only."
      intro={
        <>
          This page is for Eisai staff. You’re signed in as{' '}
          <span className="break-all">{user?.email}</span>, which doesn’t have
          staff access.
        </>
      }
      size="lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/" className={primaryButton}>
          Back to home
        </Link>
        <button type="button" onClick={signOut} className={secondaryButton}>
          Log in with a staff account
        </button>
      </div>
    </AccountLayout>
  );
}
