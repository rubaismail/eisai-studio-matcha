import { useEffect, useRef, useState } from 'react';
import arrowLeft from '../assets/arrow-left.svg';
import arrowRight from '../assets/arrow-right.svg';
import latte from '../assets/home/popup-latte.jpg';
import park from '../assets/home/popup-park.jpg';
import poster1 from '../assets/home/popup-video-1.jpg';
import video1 from '../assets/home/popup-video-1.mp4';
import poster2 from '../assets/home/popup-video-2.jpg';
import video2 from '../assets/home/popup-video-2.mp4';
import poster3 from '../assets/home/popup-video-3.jpg';
import video3 from '../assets/home/popup-video-3.mp4';
import playIcon from '../assets/play-button.svg';
import { INSTAGRAM_URL } from './Navbar';
import { focusRing, label } from './styles';

type Slide =
  | { kind: 'video'; src: string; poster: string; label: string }
  | { kind: 'photo'; src: string; alt: string };

// Same slides, in the same order, as the mobile app.
const slides: Slide[] = [
  { kind: 'video', src: video1, poster: poster1, label: 'Making a drink' },
  {
    kind: 'photo',
    src: latte,
    alt: 'Two matcha lattes with leaf latte art on a café table',
  },
  {
    kind: 'video',
    src: video2,
    poster: poster2,
    label: 'Whisking at the stand',
  },
  {
    kind: 'photo',
    src: park,
    alt: 'A layered matcha drink held up by a lake in Orlando',
  },
  { kind: 'video', src: video3, poster: poster3, label: 'The pop-up table' },
];

const card = 'h-[429px] w-[292px] lg:h-[569px] lg:w-80';
const tag =
  'absolute top-3 left-3 bg-white px-2 py-1 font-mono text-[11px] leading-none tracking-[0.08em] text-ink uppercase';
const GAP = 12;

function prefersReducedMotion() {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

export default function PopUpCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Videos only play while the section is on screen.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function step() {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    return (first?.offsetWidth ?? 0) + GAP;
  }

  // The card scrolled to the left edge is the active one, as in the app.
  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const size = step();
    if (size > GAP) setActive(Math.round(track.scrollLeft / size));
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  }

  function scrollByCard(direction: 1 | -1) {
    trackRef.current?.scrollBy({
      left: direction * step(),
      behavior: 'smooth',
    });
  }

  const arrowButton = `flex size-12 items-center justify-center border border-ink bg-white disabled:opacity-40 ${focusRing}`;

  return (
    <section aria-labelledby="popup-heading" className="pb-18 lg:pb-24">
      <div className="flex items-center justify-between px-4 lg:pr-[43px] lg:pl-[43px]">
        <h2 id="popup-heading" className={label}>
          At the pop-up
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-mono text-[13px] tracking-[0.08em] underline underline-offset-2 hover:no-underline lg:mr-2 lg:text-[14px] ${focusRing}`}
          >
            @eisaistudio →<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label="Previous"
            className={`hidden lg:flex ${arrowButton}`}
          >
            <img src={arrowLeft} alt="" width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label="Next"
            className={`hidden lg:flex ${arrowButton}`}
          >
            <img src={arrowRight} alt="" width={16} height={16} />
          </button>
        </div>
      </div>
      <ul
        ref={trackRef}
        onScroll={handleScroll}
        className="mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] lg:mt-7 lg:scroll-px-[14px] lg:px-[14px] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <li
            key={slide.src}
            className={`relative shrink-0 snap-start ${card}`}
          >
            {slide.kind === 'video' ? (
              <VideoSlide
                slide={slide}
                number={
                  slides.slice(0, i + 1).filter((s) => s.kind === 'video')
                    .length
                }
                active={i === active}
                onScreen={onScreen}
              />
            ) : (
              <>
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <p className={tag}>Photo</p>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-5 px-4 font-mono text-[12px] tracking-[0.08em] text-ink-muted uppercase lg:hidden">
        Swipe to explore →
      </p>
    </section>
  );
}

function VideoSlide({
  slide,
  number,
  active,
  onScreen,
}: {
  slide: Extract<Slide, { kind: 'video' }>;
  number: number;
  active: boolean;
  onScreen: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // null: follow the carousel; true/false: the visitor played or paused it.
  const [choice, setChoice] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const playing =
    !failed && onScreen && (choice ?? (active && !prefersReducedMotion()));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing)
      video.play()?.catch((err: unknown) => {
        // A pause cuts off a pending play; only a refusal (e.g. autoplay
        // blocked) should leave it paused.
        if ((err as Error)?.name !== 'AbortError') setChoice(false);
      });
    else video.pause();
  }, [playing]);

  const name = `video ${number}: ${slide.label}`;

  return (
    <>
      <video
        ref={videoRef}
        src={slide.src}
        poster={slide.poster}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        aria-hidden="true"
        className="size-full bg-ink object-cover"
      />
      {failed ? (
        <p className="absolute inset-x-0 bottom-4 text-center font-mono text-[12px] tracking-[0.08em] text-white uppercase">
          Video unavailable
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setChoice(!playing)}
          aria-label={`${playing ? 'Pause' : 'Play'} ${name}`}
          className={`absolute inset-0 flex items-center justify-center ${focusRing} focus-visible:outline-offset-[-4px] focus-visible:outline-white`}
        >
          {!playing && (
            <img
              src={playIcon}
              alt=""
              width={64}
              height={64}
              className="size-14 lg:size-16"
            />
          )}
        </button>
      )}
      <p className={tag}>Video</p>
    </>
  );
}
