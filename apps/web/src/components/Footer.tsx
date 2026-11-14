import matchaMan from '../assets/matcha-man-peeking.png';
import wordmark from '../assets/eisai-wordmark-white.png';
import { Link } from 'react-router';
import { CONTACT_EMAIL, INSTAGRAM_URL } from './links';

// Update when the schedule changes.
const schedule = [
  { place: 'UCF Student Union', hours: 'Wednesdays · 9AM – 5PM' },
  { place: 'Sanford Farmers Market', hours: 'Saturdays · 10AM – 3PM' },
  { place: 'Mount Dora', hours: 'Sundays · 9AM – 2PM' },
];

const heading = 'font-mono text-[14px] tracking-[0.08em] text-lime uppercase';
const footerLink = `text-[17px] leading-6 text-white underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`;

export default function Footer() {
  return (
    <footer className="relative overflow-clip bg-ink text-white">
      <div className="flex flex-col gap-9 px-4 pt-12 pb-10 lg:flex-row lg:gap-12 lg:px-[43px] lg:pt-[72px] lg:pb-12">
        <div className="flex flex-col gap-4 lg:flex-1 lg:gap-5">
          <img
            src={wordmark}
            alt="Eisai"
            loading="lazy"
            className="h-[29px] w-[112px] object-contain object-left lg:h-9 lg:w-[140px]"
          />
          <p className="max-w-[360px] text-[28px] leading-[33px] lg:text-[34px] lg:leading-[39px]">
            A little Zen. A little unexpected. Seriously good matcha.
          </p>
        </div>

        <section
          id="find-us"
          aria-labelledby="schedule-heading"
          className="flex flex-col gap-3.5 lg:w-[340px]"
        >
          <h2 id="schedule-heading" className={heading}>
            Whisking schedule
          </h2>
          <ul className="flex flex-col gap-6">
            {schedule.map(({ place, hours }) => (
              <li key={place} className="flex flex-col gap-1">
                <span className="font-mono text-[14px] tracking-[0.08em] uppercase">
                  {place}
                </span>
                <span className="text-[17px] leading-6">{hours}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6 lg:w-[240px]">
          <section
            aria-labelledby="follow-heading"
            className="flex flex-col gap-3.5"
          >
            <h2 id="follow-heading" className={heading}>
              Follow along
            </h2>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 self-start ${footerLink}`}
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="shrink-0"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle
                  cx="17.4"
                  cy="6.6"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
              @eisaistudio
              <span className="sr-only">
                {' '}
                on Instagram (opens in a new tab)
              </span>
            </a>
          </section>
          <section
            aria-labelledby="contact-heading"
            className="flex flex-col gap-3.5"
          >
            <h2 id="contact-heading" className={heading}>
              Contact
            </h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`self-start break-all ${footerLink}`}
            >
              {CONTACT_EMAIL}
            </a>
          </section>
        </div>
      </div>

      {/* Phone: right padding keeps the text clear of the illustration. */}
      <div className="flex flex-col gap-1.5 border-t border-white/35 pt-[18px] pb-6 pl-4 pr-[120px] font-mono text-[11px] leading-none tracking-[0.08em] uppercase lg:flex-row lg:justify-between lg:px-[43px] lg:pt-5 lg:pb-7 lg:text-[12px]">
        <p>Copyright © Eisai Studio LLC</p>
        <p>Eisai Studio LLC · Orlando, Florida</p>
        <Link
          to="/privacy"
          className="self-start underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Privacy policy
        </Link>
      </div>

      {/* Desktop: sits just left of the address so it never covers it. */}
      <img
        src={matchaMan}
        alt=""
        loading="lazy"
        className="pointer-events-none absolute right-4 -bottom-[45px] h-[115px] w-24 object-contain opacity-90 lg:right-[340px] lg:-bottom-[70px] lg:h-[180px] lg:w-[150px]"
      />
    </footer>
  );
}
