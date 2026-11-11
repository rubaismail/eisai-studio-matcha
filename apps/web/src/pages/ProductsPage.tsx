import { Link } from 'react-router';
import { INSTAGRAM_URL } from '../components/links';
import { label, primaryButton, secondaryButton } from '../components/styles';

export default function ProductsPage() {
  return (
    <section className="flex flex-col items-center gap-[22px] px-4 pt-[120px] pb-18 text-center lg:gap-6 lg:px-[43px] lg:pt-40 lg:pb-[180px]">
      <p className={`${label} leading-4 text-ink-muted`}>Products</p>
      <h1 className="text-[56px] leading-[58px] tracking-[-0.02em] lg:text-[96px] lg:leading-[96px]">
        Coming soon.
      </h1>
      <p className="text-[16px] leading-[25px] text-ink-muted lg:text-[18px] lg:leading-[31px]">
        Follow @eisaistudio to hear when it’s ready.
      </p>
      <div className="flex w-full flex-col gap-[22px] sm:w-auto sm:flex-row sm:gap-3">
        <Link to="/menu" className={primaryButton}>
          See the menu
        </Link>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButton}
        >
          Follow on Instagram
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
