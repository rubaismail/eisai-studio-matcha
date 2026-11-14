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

test('every video in view plays by itself', () => {
  render(<PopUpCarousel />);
  expect(playing()).toEqual([
    'Pause video 1: Making a Mango Dango',
    'Pause video 2: Making a Midnight Mori',
    'Pause video 3: Pouring a layered drink at the stand',
    'Pause video 4: Whisking at the stand',
    'Pause video 5: Our first pop-up',
    'Pause video 6: The pop-up table',
  ]);
  expect(play).toHaveBeenCalledTimes(6);
});

test('tapping a video pauses it, and tapping again plays it', () => {
  render(<PopUpCarousel />);
  fireEvent.click(screen.getByRole('button', { name: /^Pause video 1/ }));
  expect(
    screen.getByRole('button', { name: /^Play video 1/ }),
  ).toBeInTheDocument();
  expect(pause).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Play video 1/ }));
  expect(playing()).toEqual(['Pause video 1: Making a Mango Dango']);
});

test('pausing one video stops autoplay for the whole row', () => {
  render(<PopUpCarousel />);
  const pauseButton = screen.getByRole('button', { name: /^Pause video 2/ });
  // The pause control is visible while it plays, not only on hover.
  expect(pauseButton.querySelector('svg')).toBeInTheDocument();
  fireEvent.click(pauseButton);
  expect(screen.queryAllByRole('button', { name: /^Pause/ })).toHaveLength(0);
  // Any of them can still be played on purpose.
  fireEvent.click(screen.getByRole('button', { name: /^Play video 3/ }));
  expect(playing()).toEqual([
    'Pause video 3: Pouring a layered drink at the stand',
  ]);
});

test('each video describes what happens in it, for screen readers', () => {
  render(<PopUpCarousel />);
  expect(
    screen.getByRole('button', { name: /video 1: Making a Mango Dango/ }),
  ).toHaveAccessibleDescription(/On-screen text: .*Mango Dango!/);
  for (const button of screen.getAllByRole('button', { name: /video \d/ }))
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
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
  // Still following autoplay, so it shows as playing.
  expect(playing()).toContain('Pause video 1: Making a Mango Dango');
});

// Fake IntersectionObserver: tests report what's on screen themselves.
function fakeObserver() {
  const observers = new Map<
    Element,
    (e: { isIntersecting: boolean }[]) => void
  >();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      callback: (e: { isIntersecting: boolean }[]) => void;
      constructor(callback: (e: { isIntersecting: boolean }[]) => void) {
        this.callback = callback;
      }
      observe(el: Element) {
        observers.set(el, this.callback);
      }
      disconnect() {}
    },
  );
  return (el: Element, isIntersecting: boolean) =>
    act(() => observers.get(el)!([{ isIntersecting }]));
}

test('photos, videos and still frames only download once the row is close', () => {
  const report = fakeObserver();
  render(<PopUpCarousel />);
  const videos = [...document.querySelectorAll('video')];
  for (const video of videos) {
    expect(video).not.toHaveAttribute('src');
    expect(video).not.toHaveAttribute('poster');
  }
  const photo = screen.getByRole('img', { name: /latte art/ });
  expect(photo).not.toHaveAttribute('src');
  expect(play).not.toHaveBeenCalled();

  report(screen.getAllByRole('list')[0], true);
  for (const video of videos) {
    expect(video).toHaveAttribute('src');
    expect(video).toHaveAttribute('poster');
  }
  expect(photo.getAttribute('srcset')).toMatch(/320w, .* 640w/);
  // Close isn't on screen: nothing plays yet.
  expect(play).not.toHaveBeenCalled();
  report(videos[0], true);
  expect(playing()).toEqual(['Pause video 1: Making a Mango Dango']);
});

test('videos pause off screen, even one the visitor started', () => {
  const report = fakeObserver();
  render(<PopUpCarousel />);
  report(screen.getAllByRole('list')[0], true);
  for (const video of document.querySelectorAll('video')) report(video, true);
  expect(playing()).toHaveLength(6);

  report(videoOf(/video 6/), false);
  expect(playing()).not.toContain('Pause video 6: The pop-up table');
  expect(playing()).toHaveLength(5);

  fireEvent.click(screen.getByRole('button', { name: /^Pause video 1/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Play video 1/ }));
  report(videoOf(/video 1/), false);
  expect(screen.queryAllByRole('button', { name: /^Pause/ })).toHaveLength(0);
  report(videoOf(/video 1/), true);
  expect(playing()).toEqual(['Pause video 1: Making a Mango Dango']);
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
