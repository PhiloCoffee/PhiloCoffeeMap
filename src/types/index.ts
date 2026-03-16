export type Vibe = 'study' | 'chill' | 'social' | 'contemplative';

export const VIBE_SYMBOLS: Record<Vibe, string> = {
  study: 'λ',
  contemplative: 'φ',
  chill: '∞',
  social: 'Ω',
};

export const VIBE_LABELS: Record<Vibe, string> = {
  study: 'Study',
  chill: 'Chill',
  social: 'Social',
  contemplative: 'Contemplative',
};

export interface CoffeeSpot {
  id: number;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  notes?: string | null;
  philosophy_quote?: string | null;
  vibe?: Vibe | null;
  rating?: number | null;
  tags?: string[] | null;
  photos?: string[] | null;
  visited_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoffeeSpotInput {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  notes?: string;
  philosophy_quote?: string;
  vibe?: Vibe;
  rating?: number;
  tags?: string[];
  photos?: string[];
  visited_at?: string;
}

export interface ImportRow {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  notes?: string;
  philosophy_quote?: string;
  vibe?: string;
  rating?: number;
  tags?: string;
  visited_at?: string;
}
