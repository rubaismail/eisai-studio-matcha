import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getMenu } from '../api/menu';
import hero600 from '../assets/home/hero-600.webp';
import hero900 from '../assets/home/hero-900.webp';
import hero1170 from '../assets/home/hero-1170.webp';
import heroWide1440 from '../assets/home/hero-wide-1440.webp';
import heroWide1920 from '../assets/home/hero-wide-1920.webp';
import heroWide2400 from '../assets/home/hero-wide-2400.webp';
import matchaMan from '../assets/home/matcha-man.png';
import DrinkTile from '../components/DrinkTile';
import PopUpCarousel from '../components/PopUpCarousel';
import { focusRing, label } from '../components/styles';
import type { MenuItem } from '../types/menu';

// Same rule as the mobile app's home screen.
function isSpecial(item: MenuItem) {
  return (
    item.isFeatured &&
    item.isAvailable &&
    item.category?.trim().toLowerCase() !== 'treats'
  );
}

const flavors = [
  { name: 'Nutty', notes: 'Roasted, warm notes' },
  { name: 'Floral', notes: 'Light, aromatic' },
  { name: 'Umami', notes: 'Savory, deep' },
];

// Keep in sync with the hero preloads in index.html, or phones download it twice.
const heroPhone = `${hero600} 600w, ${hero900} 900w, ${hero1170} 1170w`;
const heroDesktop = `${heroWide1440} 1440w, ${heroWide1920} 1920w, ${heroWide2400} 2400w`;

const heroButton = `inline-flex min-h-12 items-center justify-center border border-white px-6 font-mono text-[14px] tracking-[0.08em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:px-7`;
const underlinedLink = `font-mono text-[14px] tracking-[0.08em] text-ink uppercase underline underline-offset-2 hover:no-underline ${focusRing}`;
const sectionTitle =
  'text-[30px] leading-[35px] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]';
const sectionText =
  'max-w-140 text-[16px] leading-[25px] text-ink-muted lg:text-[17px] lg:leading-[29px]';

export default function HomePage() {
  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [accountDeleted, setAccountDeleted] = useState(false);

  // Set by the Account page after deleting the account. Shown once: the flag is
  // cleared from history so a refresh doesn't bring the message back. It's set
  // after the first render so screen readers announce the status region.
  useEffect(() => {
    if (
      !(location.state as { accountDeleted?: boolean } | null)?.accountDeleted
    )
      return;
    setAccountDeleted(true);
    const { pathname, search, hash } = location;
    navigate({ pathname, search, hash }, { replace: true, state: null });
  }, [location, navigate]);

  useEffect(() => {
    let active = true;
    getMenu()
      .then((items) => {
        if (!active) return;
        setFeatured(items.filter(isSpecial));
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }

  return (
    <>
      <div role="status">
        {accountDeleted && (
          <p className="bg-lavender px-4 py-3.5 text-[16px] leading-[23px] text-ink lg:px-[58px]">
            Your account has been deleted.
          </p>
        )}
      </div>
      <section className="relative h-[640px] overflow-clip bg-ink lg:h-[760px]">
        {/* Desktop uses a copy squashed to the design's proportions, which
            fits more of the scenery like the design does. */}
        <picture>
          <source
            media="(min-width: 64rem)"
            srcSet={heroDesktop}
            sizes="100vw"
          />
          <img
            src={hero1170}
            srcSet={heroPhone}
            sizes="100vw"
            alt=""
            // The hero is the largest thing on screen; fetch it before other images.
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[center_60%] lg:object-[center_70%]"
          />
        </picture>
        <div className="absolute inset-0 bg-linear-to-b from-transparent from-25% via-ink/35 via-55% to-ink/80" />
        <div className="absolute inset-x-4 bottom-8 flex flex-col gap-3.5 lg:inset-x-[58px] lg:bottom-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3.5 text-white lg:gap-[18px]">
            <p className={`${label} text-lime`}>Your Shade, Your Whisk.</p>
            <h1 className="text-[40px] leading-[42px] tracking-[-0.02em] lg:max-w-190 lg:text-[72px] lg:leading-[73px]">
              Building a new matcha experience in Orlando, Florida.
            </h1>
            <p className="text-[17px] leading-[25px] lg:text-[20px] lg:leading-normal">
              Not all matcha tastes the same.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2 lg:shrink-0 lg:flex-row lg:gap-3 lg:pt-0">
            <Link to="/menu" className={`${heroButton} bg-white text-ink`}>
              See the menu
            </Link>
            <Link to="/#find-us" className={`${heroButton} text-white`}>
              Find us this week
            </Link>
          </div>
        </div>
      </section>

      <section
        id="our-story"
        aria-labelledby="story-heading"
        className="flex flex-col items-center gap-[18px] px-4 py-18 text-center lg:gap-[22px] lg:px-[58px] lg:py-28"
      >
        <img
          src={matchaMan}
          alt=""
          loading="lazy"
          className="h-[86px] w-[72px] object-contain lg:h-[106px] lg:w-[88px]"
        />
        <p className={`${label} text-ink-muted`}>Our story</p>
        <h2 id="story-heading" className={`${sectionTitle} max-w-140`}>
          Two people. A whisk. A lot of opinions about matcha.
        </h2>
        <p className={sectionText}>
          We’re the two people behind Eisai. If you’ve visited one of our
          Orlando pop-ups, you’ve probably met us—with a whisk in hand and a
          growing collection of green stains.
        </p>
        <Link to="/our-story" className={underlinedLink}>
          Read our story →
        </Link>
      </section>

      <section className="flex flex-col items-center gap-4 px-4 pb-18 text-center lg:gap-5 lg:pb-28">
        <h2 className={sectionTitle}>Matcha has more than one flavor.</h2>
        <p className={sectionText}>
          In Asia matcha is chosen by cultivar, region, and flavor profile. In
          the U.S., most cafés offer just one option. We believe customers are
          ready for more.
        </p>
        <ul className="flex flex-col items-center gap-[18px] pt-2 lg:flex-row lg:items-start lg:gap-14 lg:pt-4">
          {flavors.map((flavor) => (
            <li
              key={flavor.name}
              className="flex flex-col items-center gap-1 lg:gap-1.5"
            >
              <span className={label}>{flavor.name}</span>
              <span className="text-[15px] text-ink-muted">{flavor.notes}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="special-heading"
        className="mx-auto max-w-[1126px] px-4 pt-16 pb-18 lg:px-[43px] lg:pt-[88px] lg:pb-24"
      >
        <div className="flex flex-col items-start gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2 lg:gap-2.5">
            <p className={`${label} text-ink-muted`}>On the menu now</p>
            <h2
              id="special-heading"
              className="text-[36px] tracking-[-0.02em] lg:text-[44px] lg:leading-[44px]"
            >
              Eisai’s Special
            </h2>
          </div>
          <Link to="/menu" className={underlinedLink}>
            See the full menu →
          </Link>
        </div>
        {/* Placeholders hold the space, so a jump to the footer schedule
              isn't pushed down when the drinks arrive. */}
        {status === 'loading' && (
          <div
            aria-hidden="true"
            className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-5"
          >
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex flex-col gap-3">
                <div className="aspect-[6/5] bg-lavender lg:aspect-square" />
                <div className="h-3 w-[55%] bg-rule" />
                <div className="h-3 w-[84%] bg-rule" />
              </div>
            ))}
          </div>
        )}
        {status === 'error' && (
          <div className="mt-6 flex flex-col items-start gap-3 lg:mt-8">
            <p className="text-[14px] text-ink-muted">
              Featured drinks could not be loaded.
            </p>
            <button type="button" onClick={retry} className={underlinedLink}>
              Try again
            </button>
          </div>
        )}
        {status === 'ready' && featured.length === 0 && (
          <p className="mt-6 text-[14px] text-ink-muted lg:mt-8">
            No featured drinks right now.
          </p>
        )}
        {featured.length > 0 && (
          <ul className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-5">
            {featured.map((item) => (
              <li key={item._id}>
                <DrinkTile item={item} variant="home" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <PopUpCarousel />
    </>
  );
}
