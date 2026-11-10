import { useEffect, useId, useRef, useState } from 'react';
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
import poster4 from '../assets/home/popup-video-4.jpg';
import video4 from '../assets/home/popup-video-4.mp4';
import poster5 from '../assets/home/popup-video-5.jpg';
import video5 from '../assets/home/popup-video-5.mp4';
import poster6 from '../assets/home/popup-video-6.jpg';
import video6 from '../assets/home/popup-video-6.mp4';
import playIcon from '../assets/play-button.svg';
import { INSTAGRAM_URL } from './links';
import { focusRing, label } from './styles';

type Slide =
  | {
      kind: 'video';
      src: string;
      poster: string;
      label: string;
      // For screen readers: the videos are silent, so describe them.
      description: string;
    }
  | { kind: 'photo'; src: string; alt: string };

// Photos are spread out so no more than two videos sit side by side.
const slides: Slide[] = [
  {
    kind: 'video',
    src: video4,
    poster: poster4,
    label: 'Making a Mango Dango',
    description:
      'Mango puree is blended and layered under iced matcha. On-screen text: Eisai’s this week debut: Mango Dango! (Mango sticky rice).',
  },
  {
    kind: 'video',
    src: video1,
    poster: poster1,
    label: 'Making a Midnight Mori',
    description:
      'Milk is poured over a purple base, then matcha and a cream topping. On-screen text: Midnight Mori.',
  },
  {
    kind: 'photo',
    src: latte,
    alt: 'Two matcha lattes with leaf latte art on a café table',
  },
  {
    kind: 'video',
    src: video5,
    poster: poster5,
    label: 'Pouring a layered drink at the stand',
    description:
      'A gloved hand pours matcha over a layered drink at the pop-up and adds foam. On-screen text: Matcha Blossom Trail, with Montblanc foam.',
  },
  {
    kind: 'video',
    src: video2,
    poster: poster2,
    label: 'Whisking at the stand',
    description:
      'Two team members in Eisai shirts whisk and serve matcha under the pop-up tent.',
  },
  {
    kind: 'photo',
    src: park,
    alt: 'A layered matcha drink held up by a lake in Orlando',
  },
  {
    kind: 'video',
    src: video6,
    poster: poster6,
    label: 'Our first pop-up',
    description:
      'The Eisai tent at its first pop-up, with the team and visitors. On-screen text includes: our 1st event, and we will see you again soon!',
  },
  {
    kind: 'video',
    src: video3,
    poster: poster3,
    label: 'The pop-up table',
    description: 'The pop-up table with menu cards and bowls of matcha.',
  },
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
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  // Pausing any video stops autoplay for the whole row.
  const [autoplay, setAutoplay] = useState(() => !prefersReducedMotion());

  function step() {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    return (first?.offsetWidth ?? 0) + GAP;
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
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
                autoplay={autoplay}
                onPause={() => setAutoplay(false)}
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
  autoplay,
  onPause,
}: {
  slide: Extract<Slide, { kind: 'video' }>;
  number: number;
  autoplay: boolean;
  onPause: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // null: follow the carousel; true/false: the visitor played or paused it.
  const [choice, setChoice] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const playing = !failed && visible && (choice ?? autoplay);

  // Every video in view plays; ones scrolled out of view (either way) pause.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

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
  const descriptionId = useId();

  function toggle() {
    if (playing) onPause();
    setChoice(!playing);
  }

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
          onClick={toggle}
          aria-label={`${playing ? 'Pause' : 'Play'} ${name}`}
          aria-describedby={descriptionId}
          className={`absolute inset-0 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white`}
        >
          {playing ? (
            // Always visible, so people can see how to stop it.
            <span className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-ink/70">
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 14 14"
              >
                <rect x="2" y="1" width="3.5" height="12" fill="white" />
                <rect x="8.5" y="1" width="3.5" height="12" fill="white" />
              </svg>
            </span>
          ) : (
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
      <p id={descriptionId} className="sr-only">
        {slide.description}
      </p>
      <p className={tag}>Video</p>
    </>
  );
}
