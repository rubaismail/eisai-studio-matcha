import '@testing-library/jest-dom/vitest';

// jsdom has no scrollTo.
window.scrollTo = () => {};

// jsdom can't play media.
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
