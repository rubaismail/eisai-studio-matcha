import type { MenuItem } from '../types/menu';

const variants = {
  menu: {
    tile: 'aspect-[4/5] bg-tile',
    photo: 'h-[80%] max-w-[85%]',
    text: 'gap-1.5 pt-3.5 lg:px-1.5 lg:pt-[18px]',
    name: 'text-[15px] tracking-[0.08em]',
    note: 'text-[15px] leading-[23px]',
  },
  home: {
    tile: 'aspect-[6/5] bg-lavender lg:aspect-square',
    photo: 'h-[85%] max-w-[85%]',
    text: 'gap-1 pt-3 lg:pt-3.5',
    name: 'text-[14px] tracking-[0.08em]',
    note: 'text-[14px] leading-[21px]',
  },
};

// Drink photos are cut-outs, so the shadow follows the cup, not the box.
const photoShadow =
  '[filter:drop-shadow(0_4px_6px_rgb(26_26_26/0.12))_drop-shadow(0_22px_18px_rgb(26_26_26/0.22))]';

export default function DrinkTile({
  item,
  variant = 'menu',
}: {
  item: MenuItem;
  variant?: keyof typeof variants;
}) {
  const style = variants[variant];
  return (
    <article className="flex flex-col">
      <div
        className={`relative flex items-center justify-center overflow-clip ${style.tile}`}
      >
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.imageAlt}
            loading="lazy"
            className={`w-auto object-contain ${style.photo} ${photoShadow}`}
          />
        )}
        {variant === 'menu' && item.isRecommended && (
          <p className="absolute top-3.5 left-3.5 bg-ink px-3 py-1.5 font-mono text-[11px] leading-none tracking-[0.08em] text-white uppercase lg:top-4 lg:left-4 lg:text-[12px]">
            Recommended
          </p>
        )}
      </div>
      <div className={`flex flex-col ${style.text}`}>
        <h3 className={`font-mono text-ink uppercase ${style.name}`}>
          {item.name}
        </h3>
        {item.inspiredBy && (
          <p className="text-[14px] text-ink-muted">({item.inspiredBy})</p>
        )}
        {item.description && (
          <p className={`text-ink-muted ${style.note}`}>{item.description}</p>
        )}
      </div>
    </article>
  );
}
