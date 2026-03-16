'use client';
import { VIBE_SYMBOLS } from '@/types';
import type { Vibe } from '@/types';

interface CoffeePinProps {
  vibe?: Vibe | null;
  selected?: boolean;
  size?: number;
}

export default function CoffeePin({ vibe, selected = false, size = 36 }: CoffeePinProps) {
  const symbol = vibe ? VIBE_SYMBOLS[vibe] : '☕';
  const scale = selected ? 1.3 : 1;
  const s = size * scale;

  return (
    <svg
      width={s}
      height={s * 1.25}
      viewBox="0 0 36 45"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: selected ? 'drop-shadow(0 0 6px #E8D5B7)' : undefined, cursor: 'pointer' }}
    >
      {/* Pin body (teardrop) */}
      <path
        d="M18 2C10.268 2 4 8.268 4 16c0 10 14 27 14 27s14-17 14-27C32 8.268 25.732 2 18 2z"
        fill="#C4783A"
        stroke="#E8D5B7"
        strokeWidth="1.5"
      />
      {/* Cup body */}
      <rect x="11" y="11" width="14" height="10" rx="2" fill="#1C0A00" />
      {/* Cup handle */}
      <path
        d="M25 13.5 C28 13.5 28 18.5 25 18.5"
        stroke="#E8D5B7"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Saucer */}
      <ellipse cx="18" cy="21.5" rx="7" ry="1.5" fill="#E8D5B7" opacity="0.7" />
      {/* Philosophy symbol */}
      <text
        x="18"
        y="19"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#D4AF37"
        fontSize="7"
        fontFamily="serif"
        fontWeight="bold"
      >
        {symbol}
      </text>
      {/* Selected ring */}
      {selected && (
        <circle cx="18" cy="16" r="14.5" stroke="#E8D5B7" strokeWidth="2" fill="none" opacity="0.6" />
      )}
    </svg>
  );
}
