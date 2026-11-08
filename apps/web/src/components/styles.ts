export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

export const label = 'font-mono text-[13px] tracking-[0.08em] uppercase';

const buttonBase = `inline-flex min-h-12 items-center justify-center border border-ink px-7 text-center font-mono text-[14px] tracking-[0.08em] uppercase disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

export const primaryButton = `${buttonBase} bg-ink text-white`;

export const secondaryButton = `${buttonBase} bg-white text-ink`;

export const textLink = `${label} text-ink underline underline-offset-2 hover:no-underline ${focusRing}`;

export const switchLink = `font-mono text-[13px] tracking-[0.08em] uppercase underline underline-offset-2 hover:no-underline md:text-[14px] ${focusRing}`;
