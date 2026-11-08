import type { ReactNode } from 'react';
import { label } from './styles';

// Column widths from the designs: forms 440px, Check your inbox 474px,
// message pages like Staff only 560px.
const widths = { sm: 'max-w-110', md: 'max-w-[474px]', lg: 'max-w-140' };

export default function AccountLayout({
  eyebrow = 'Your Eisai account',
  title,
  intro,
  size = 'sm',
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  size?: keyof typeof widths;
  children: ReactNode;
}) {
  return (
    <section className="px-4 pt-12 pb-18 md:px-15 md:pt-24 md:pb-28">
      <div
        className={`mx-auto flex w-full flex-col gap-6 md:gap-7 ${widths[size]}`}
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
