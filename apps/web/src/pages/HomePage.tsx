import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getMenu } from '../api/menu';
import hero from '../assets/home/hero.jpg';
import matchaMan from '../assets/home/matcha-man.png';
import DrinkTile from '../components/DrinkTile';
import PopUpCarousel from '../components/PopUpCarousel';
import { focusRing, label } from '../components/styles';
import type { MenuItem } from '../types/menu';

const flavors = [
  { name: 'Nutty', notes: 'Roasted, warm notes' },
  { name: 'Floral', notes: 'Light, aromatic' },
  { name: 'Umami', notes: 'Savory, deep' },
];

const heroButton = `inline-flex min-h-12 items-center justify-center border border-white px-6 font-mono text-[14px] tracking-[0.08em] uppercase lg:px-7 ${focusRing} focus-visible:outline-white`;
const underlinedLink = `font-mono text-[14px] tracking-[0.08em] text-ink uppercase underline underline-offset-2 hover:no-underline ${focusRing}`;
const sectionTitle =
  'text-[30px] leading-[35px] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]';
const sectionText =
  'max-w-140 text-[16px] leading-[25px] text-ink-muted lg:text-[17px] lg:leading-[29px]';

export default function HomePage() {
  const [featured, setFeatured] = useState<MenuItem[]>([]);

  useEffect(() => {
    let active = true;
    getMenu()
      .then((items) => {
        if (active) setFeatured(items.filter((item) => item.isFeatured));
      })
      // The section just stays hidden if the menu can't load.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="relative h-[640px] overflow-clip bg-ink lg:h-[760px]">
        <img
          src={hero}
          alt=""
          className="absolute inset-0 size-full object-cover object-[center_60%] lg:object-[center_80%]"
        />
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

      {featured.length > 0 && (
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
          <ul className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-5">
            {featured.map((item) => (
              <li key={item._id}>
                <DrinkTile item={item} variant="home" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <PopUpCarousel />
    </>
  );
}
