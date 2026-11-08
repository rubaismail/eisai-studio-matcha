import type { ReactNode } from 'react';
import { label } from './styles';

export default function AccountLayout({
  eyebrow = 'Your Eisai account',
  title,
  intro,
  wide = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  // 560px instead of 440px.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="px-4 pt-12 pb-16 md:px-15 md:pt-24 md:pb-28">
      <div
        className={`mx-auto flex w-full flex-col gap-7 ${wide ? 'max-w-140' : 'max-w-110'}`}
      >
        <div className="flex flex-col gap-3">
          <p className={`${label} text-ink-muted`}>{eyebrow}</p>
          <h1 className="text-[44px] leading-[46px] tracking-[-0.02em] md:text-[64px] md:leading-[66px]">
            {title}
          </h1>
          {intro && (
            <p className="text-[17px] leading-[26px] text-ink-muted">{intro}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
