import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import PopUpCarousel from './PopUpCarousel';

let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockResolvedValue(undefined);
  pause = vi
    .spyOn(HTMLMediaElement.prototype, 'pause')
    .mockImplementation(() => {});
  // Cards are 292px wide, plus a 12px gap.
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(292);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const playing = () =>
  screen
    .getAllByRole('button', { name: /^Pause video/ })
    .map((b) => b.getAttribute('aria-label'));
const videoOf = (name: RegExp) =>
  screen.getByRole('button', { name }).parentElement!.querySelector('video')!;

test('has all eight slides, with photos between the videos', () => {
  render(<PopUpCarousel />);
  const slides = screen.getAllByRole('listitem');
  expect(
    slides.map((s) => (s.querySelector('video') ? 'video' : 'photo')),
  ).toEqual([
    'video',
    'video',
    'photo',
    'video',
    'video',
    'photo',
    'video',
    'video',
  ]);
  expect(
    screen.getByRole('img', { name: /matcha lattes with leaf latte art/ }),
  ).toBeInTheDocument();
  for (const video of document.querySelectorAll('video')) {
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('poster');
  }
});

test('only the first video plays until the row is scrolled', () => {
  render(<PopUpCarousel />);
  expect(playing()).toEqual(['Pause video 1: Making a Mango Dango']);
  expect(play).toHaveBeenCalledTimes(1);

  const track = screen.getAllByRole('list')[0];
  track.scrollLeft = 912; // three cards along: video 3
  fireEvent.scroll(track);
  expect(playing()).toEqual([
    'Pause video 3: Pouring a layered drink at the stand',
  ]);
  expect(pause).toHaveBeenCalled();
});

test('tapping a video pauses it, and tapping again plays it', () => {
  render(<PopUpCarousel />);
  fireEvent.click(screen.getByRole('button', { name: /^Pause video 1/ }));
  expect(
    screen.getByRole('button', { name: /^Play video 1/ }),
  ).toBeInTheDocument();
  expect(pause).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Play video 1/ }));
  expect(
    screen.getByRole('button', { name: /^Pause video 1/ }),
  ).toBeInTheDocument();

  // A video that isn't in front can still be played.
  fireEvent.click(screen.getByRole('button', { name: /^Play video 3/ }));
  expect(playing()).toContain(
    'Pause video 3: Pouring a layered drink at the stand',
  );
});

test('nothing plays by itself for visitors who prefer less motion', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
  }));
  render(<PopUpCarousel />);
  expect(screen.queryAllByRole('button', { name: /^Pause/ })).toHaveLength(0);
  expect(play).not.toHaveBeenCalled();
});

test('a video the browser refuses to play shows its play button', async () => {
  play.mockRejectedValue(new Error('NotAllowedError'));
  render(<PopUpCarousel />);
  await act(async () => {});
  expect(
    screen.getByRole('button', { name: /^Play video 1/ }),
  ).toBeInTheDocument();
});

test('a play cut short by a pause still autoplays later', async () => {
  play.mockRejectedValueOnce(new DOMException('interrupted', 'AbortError'));
  render(<PopUpCarousel />);
  await act(async () => {});
  // Still following the carousel, so it shows as playing.
  expect(playing()).toEqual(['Pause video 1: Making a Mango Dango']);
});

test('videos pause off screen, even one the visitor started', () => {
  let report!: (entries: { isIntersecting: boolean }[]) => void;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof report) {
        report = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  render(<PopUpCarousel />);
  fireEvent.click(screen.getByRole('button', { name: /^Play video 3/ }));
  act(() => report([{ isIntersecting: false }]));
  expect(screen.queryAllByRole('button', { name: /^Pause/ })).toHaveLength(0);
  act(() => report([{ isIntersecting: true }]));
  expect(playing()).toEqual([
    'Pause video 1: Making a Mango Dango',
    'Pause video 3: Pouring a layered drink at the stand',
  ]);
});

test('a video that fails to load says so', () => {
  render(<PopUpCarousel />);
  fireEvent.error(videoOf(/video 2/));
  expect(screen.getByText('Video unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /video 2/ })).toBeNull();
});

test('arrow buttons move one card at a time', () => {
  render(<PopUpCarousel />);
  const track = screen.getAllByRole('list')[0];
  track.scrollBy = vi.fn();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(track.scrollBy).toHaveBeenCalledWith({
    left: 304,
    behavior: 'smooth',
  });
});

test('the Instagram link opens in a new tab', () => {
  render(<PopUpCarousel />);
  expect(
    screen.getByRole('link', {
      name: /^@eisaistudio →\s*\(opens in a new tab\)$/,
    }),
  ).toHaveAttribute('target', '_blank');
});
