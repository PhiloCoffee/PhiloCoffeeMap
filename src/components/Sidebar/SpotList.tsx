'use client';
import { useState } from 'react';
import type { CoffeeSpot, Vibe, ListType } from '@/types';
import { VIBE_LABELS, VIBE_SYMBOLS, LIST_TYPE_LABELS, LIST_TYPE_PINS } from '@/types';

interface SpotListProps {
  spots: CoffeeSpot[];
  selectedId?: number | null;
  onSelect: (spot: CoffeeSpot) => void;
  onImport: () => void;
}

const VIBES: Vibe[] = ['study', 'chill', 'social', 'contemplative'];
const LIST_TYPES: ListType[] = ['favourite', 'friend', 'wantto'];

function StarRating({ rating }: { rating: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? 'text-caramel' : 'text-caramel/20'}>★</span>
      ))}
    </span>
  );
}

export default function SpotList({ spots, selectedId, onSelect, onImport }: SpotListProps) {
  const [search, setSearch] = useState('');
  const [filterVibe, setFilterVibe] = useState<Vibe | 'all'>('all');
  const [filterList, setFilterList] = useState<ListType | 'all'>('all');
  const [filterRating, setFilterRating] = useState(0);

  const safeSpots = Array.isArray(spots) ? spots : [];
  const filtered = safeSpots.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesVibe = filterVibe === 'all' || s.vibe === filterVibe;
    const matchesList = filterList === 'all' || (s.list_type ?? 'favourite') === filterList;
    const matchesRating = filterRating === 0 || (s.rating ?? 0) >= filterRating;
    return matchesSearch && matchesVibe && matchesList && matchesRating;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header with logo */}
      <div className="p-4 border-b border-caramel/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-primary-dark.svg" alt="PhiloCoffeeMap" width={36} height={36} className="rounded-md" />
            <h1 className="font-playfair text-cream text-xl">PhiloCoffeeMap</h1>
          </div>
          <button
            onClick={onImport}
            className="text-caramel hover:text-cream text-sm border border-caramel/40 rounded px-2 py-1 transition"
          >
            Import
          </button>
        </div>
        <input
          type="text"
          placeholder="Search spots, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-espresso border border-caramel/30 rounded-lg px-3 py-2 text-cream text-sm placeholder-cream/30 focus:outline-none focus:border-caramel"
        />
      </div>

      {/* List type filter */}
      <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-caramel/10">
        <button
          onClick={() => setFilterList('all')}
          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition ${filterList === 'all' ? 'bg-caramel text-espresso' : 'text-cream/60 border border-caramel/20 hover:border-caramel'}`}
        >
          All lists
        </button>
        {LIST_TYPES.map((lt) => (
          <button
            key={lt}
            onClick={() => setFilterList(lt === filterList ? 'all' : lt)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full whitespace-nowrap transition ${filterList === lt ? 'bg-caramel text-espresso' : 'text-cream/60 border border-caramel/20 hover:border-caramel'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LIST_TYPE_PINS[lt]} alt={lt} width={10} height={13} />
            {LIST_TYPE_LABELS[lt]}
          </button>
        ))}
      </div>

      {/* Vibe + rating filters */}
      <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-caramel/10">
        <button
          onClick={() => setFilterVibe('all')}
          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition ${filterVibe === 'all' ? 'bg-caramel text-espresso' : 'text-cream/60 border border-caramel/20 hover:border-caramel'}`}
        >
          All vibes
        </button>
        {VIBES.map((v) => (
          <button
            key={v}
            onClick={() => setFilterVibe(v === filterVibe ? 'all' : v)}
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition ${filterVibe === v ? 'bg-caramel text-espresso' : 'text-cream/60 border border-caramel/20 hover:border-caramel'}`}
          >
            {VIBE_SYMBOLS[v]} {VIBE_LABELS[v]}
          </button>
        ))}
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(Number(e.target.value))}
          className="text-xs bg-espresso border border-caramel/20 text-cream rounded px-1 ml-auto"
        >
          <option value={0}>Any ★</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{r}★+</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-cream/40">
            <span className="text-4xl mb-2">☕</span>
            <p className="font-lora italic text-sm">No spots found</p>
          </div>
        )}
        {filtered.map((spot) => (
          <button
            key={spot.id}
            onClick={() => onSelect(spot)}
            className={`w-full text-left px-4 py-3 border-b border-caramel/10 transition hover:bg-caramel/10 ${
              selectedId === spot.id ? 'bg-caramel/20 border-l-2 border-l-caramel' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={LIST_TYPE_PINS[spot.list_type ?? 'favourite']}
                    alt={spot.list_type ?? 'favourite'}
                    width={12}
                    height={16}
                    className="flex-shrink-0"
                  />
                  {spot.vibe && (
                    <span className="text-symbol-gold text-base">{VIBE_SYMBOLS[spot.vibe as Vibe]}</span>
                  )}
                  <p className="font-playfair text-cream font-medium truncate">{spot.name}</p>
                </div>
                {spot.address && (
                  <p className="text-cream/50 text-xs truncate mt-0.5">{spot.address}</p>
                )}
                {spot.tags && spot.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {spot.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-caramel/10 text-caramel/80 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {spot.rating && <StarRating rating={spot.rating} />}
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-caramel/20 text-center">
        <p className="text-cream/30 text-xs font-lora italic">
          {filtered.length} / {safeSpots.length} spots · Click map to add
        </p>
      </div>
    </div>
  );
}
