import '@testing-library/jest-dom/vitest';

// jsdom has no scrollTo.
window.scrollTo = () => {};
