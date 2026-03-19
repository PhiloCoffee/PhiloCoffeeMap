'use client';
import { LIST_TYPE_PINS } from '@/types';
import type { ListType } from '@/types';

interface CoffeePinProps {
  listType?: ListType | null;
  selected?: boolean;
  size?: number; // width in px; height auto-scaled to 48:62 aspect ratio
}

export default function CoffeePin({ listType, selected = false, size = 32 }: CoffeePinProps) {
  const src = LIST_TYPE_PINS[listType ?? 'favourite'];
  const w = selected ? Math.round(size * 1.35) : size;
  const h = Math.round(w * 62 / 48);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={listType ?? 'favourite'}
      width={w}
      height={h}
      style={{
        display: 'block',
        filter: selected ? 'drop-shadow(0 0 6px rgba(232,213,183,0.85))' : undefined,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    />
  );
}
