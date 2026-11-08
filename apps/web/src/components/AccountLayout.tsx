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
    <section className="px-4 pt-12 pb-18 md:px-15 md:pt-24 md:pb-28">
      <div
        className={`mx-auto flex w-full flex-col gap-6 md:gap-7 ${wide ? 'max-w-140' : 'max-w-110'}`}
      >
        <div className="flex flex-col gap-2.5 md:gap-3">
          <p className={`${label} text-ink-muted`}>{eyebrow}</p>
          <h1 className="text-[44px] leading-[46px] tracking-[-0.02em] md:text-[64px] md:leading-[66px]">
            {title}
          </h1>
          {intro && (
            <p className="text-[16px] leading-[25px] text-ink-muted md:text-[17px] md:leading-[26px]">
              {intro}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
