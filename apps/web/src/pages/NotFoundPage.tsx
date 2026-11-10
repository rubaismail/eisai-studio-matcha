import { Link } from 'react-router';
import { label, primaryButton, secondaryButton } from '../components/styles';

export default function NotFoundPage() {
  return (
    <section className="px-4 pt-24 pb-18 lg:px-15 lg:pt-[120px] lg:pb-[140px]">
      <div className="mx-auto flex max-w-140 flex-col gap-[22px] lg:gap-6">
        <div className="flex flex-col gap-2.5 lg:gap-6">
          <p className={`${label} text-ink-muted`}>404</p>
          <h1 className="text-[44px] leading-[46px] tracking-[-0.02em] lg:text-[64px] lg:leading-[66px]">
            Page not found.
          </h1>
          <p className="text-[16px] leading-[25px] text-ink-muted lg:text-[17px] lg:leading-[26px]">
            We couldn’t find that page. It may have moved, or the link might be
            mistyped.
          </p>
        </div>
        <div className="flex flex-col gap-[22px] sm:flex-row sm:gap-3">
          <Link to="/" className={primaryButton}>
            Go home
          </Link>
          <Link to="/menu" className={secondaryButton}>
            See the menu
          </Link>
        </div>
      </div>
    </section>
  );
}
