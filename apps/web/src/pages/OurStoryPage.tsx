import { label } from '../components/styles';

const heading =
  'text-[24px] leading-[30px] lg:text-[26px] lg:leading-[33px] lg:tracking-[-0.01em]';
const body = 'text-[16px] leading-[27px] lg:text-[18px] lg:leading-[31px]';
const column = 'flex flex-col gap-4 lg:flex-1 lg:gap-5';

export default function OurStoryPage() {
  return (
    <article className="px-4 pt-12 pb-18 lg:px-[140px] lg:pt-[104px] lg:pb-[120px]">
      <header className="mb-[22px] flex flex-col gap-2.5 lg:mb-10 lg:gap-3.5">
        <p className={`${label} text-ink-muted`}>Eisai Studio</p>
        <h1 className="text-[56px] leading-[58px] tracking-[-0.02em] lg:text-[88px] lg:leading-[88px]">
          Our story
        </h1>
      </header>
      <div className="flex flex-col gap-[22px] border-t border-ink pt-7 lg:flex-row lg:items-start lg:gap-14 lg:pt-14">
        <div className={column}>
          <h2 className={heading}>
            Two people. A whisk. A lot of opinions about matcha.
          </h2>
          <p className={body}>
            We’re the two people behind Eisai. If you’ve visited one of our
            Orlando pop-ups, you’ve probably met us—with a whisk in hand and a
            growing collection of green stains.
          </p>
          <p className={body}>
            Eisai brings together the things we love: Japanese matcha and the
            little ritual of making something worth slowing down for.
          </p>
          <p className={body}>
            We work with specialty Japanese matcha and pay attention to its
            character: the aroma, the texture, the sweetness, the way it tastes
            with milk. Different cultivars bring different personalities.
            Finding the right one for a drink is part of the fun.
          </p>
          <p className={body}>Then come the recipe tests.</p>
          <h2 className={`${heading} lg:mt-6`}>
            A little Zen. A little unexpected. Seriously good matcha.
          </h2>
          <p className={body}>
            We love the care behind Japanese tea culture—the preparation, the
            attention, the invitation to be present. We also love seeing where a
            little curiosity can take a drink. Some days, your shade is a
            classic latte. Other days, it comes with Banana Bread.
          </p>
        </div>
        <div
          className={`${column} bg-lavender px-5 py-7 lg:px-[43px] lg:py-12`}
        >
          <h2 className={heading}>You became part of the story.</h2>
          <p className={body}>
            Eisai comes to life at our pop-ups. It’s the person taking their
            first sip of matcha. The regular who already knows their order. The
            friend who takes a sip of yours and suddenly needs their own.
          </p>
          <p className={body}>
            We’ve watched queues grow and drinks sell out. Getting to make
            something people come back for makes all those recipe adjustments
            feel pretty worthwhile. Every visit helps shape what comes next.
          </p>
          <h2 className={`${heading} lg:mt-6`}>Still whisking.</h2>
          <p className={body}>
            We’re still building Eisai. Still testing ideas. Still finding new
            shades of green to get excited about.
          </p>
          <p className={body}>
            What we want is simple: to make seriously good matcha and give you a
            cup you look forward to.
          </p>
          <div className="flex flex-col gap-2 border-t border-ink pt-5 lg:pt-6">
            <p className={heading}>Let’s find your shade.</p>
            <p className="font-mono text-[14px] tracking-[0.08em] uppercase lg:text-[15px]">
              Your Shade, Your Whisk.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
