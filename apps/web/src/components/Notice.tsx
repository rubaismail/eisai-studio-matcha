import type { ReactNode } from 'react';

export default function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'info';
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`px-4 py-3.5 text-[16px] leading-[23px] text-ink ${
        tone === 'error' ? 'border-2 border-error bg-error-bg' : 'bg-lavender'
      }`}
    >
      {children}
    </div>
  );
}
