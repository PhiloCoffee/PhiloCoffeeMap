'use client';
import { useState } from 'react';
import PhotoGallery from '@/components/UI/PhotoGallery';
import EspressoLoader from '@/components/UI/EspressoLoader';
import type { CoffeeSpot, CoffeeSpotInput, Vibe } from '@/types';
import { VIBE_LABELS, VIBE_SYMBOLS } from '@/types';

const VIBES: Vibe[] = ['study', 'chill', 'social', 'contemplative'];

interface SpotFormProps {
  initialLat?: number;
  initialLng?: number;
  existingSpot?: CoffeeSpot | null;
  onSave: (data: CoffeeSpotInput) => Promise<void>;
  onCancel: () => void;
}

function reverseGeocode(lat: number, lng: number): Promise<string> {
  return fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`)
    .then((r) => r.json())
    .then((d) => d.results?.[0]?.formatted_address ?? '');
}

export default function SpotForm({ initialLat, initialLng, existingSpot, onSave, onCancel }: SpotFormProps) {
  const [name, setName] = useState(existingSpot?.name ?? '');
  const [address, setAddress] = useState(existingSpot?.address ?? '');
  const [notes, setNotes] = useState(existingSpot?.notes ?? '');
  const [quote, setQuote] = useState(existingSpot?.philosophy_quote ?? '');
  const [vibe, setVibe] = useState<Vibe | ''>(existingSpot?.vibe ?? '');
  const [rating, setRating] = useState(existingSpot?.rating ?? 0);
  const [tags, setTags] = useState((existingSpot?.tags ?? []).join(', '));
  const [photos, setPhotos] = useState<string[]>(existingSpot?.photos ?? []);
  const [visitedAt, setVisitedAt] = useState(
    existingSpot?.visited_at ? existingSpot.visited_at.slice(0, 10) : ''
  );
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const lat = existingSpot?.lat ?? initialLat ?? 0;
  const lng = existingSpot?.lng ?? initialLng ?? 0;

  async function handleGeocode() {
    setGeocoding(true);
    try {
      const addr = await reverseGeocode(lat, lng);
      if (addr) setAddress(addr);
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        address: address.trim() || undefined,
        lat,
        lng,
        notes: notes.trim() || undefined,
        philosophy_quote: quote.trim() || undefined,
        vibe: (vibe || undefined) as Vibe | undefined,
        rating: rating || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        photos,
        visited_at: visitedAt || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (saving) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <EspressoLoader label="Saving spot…" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="p-4 border-b border-caramel/20 flex items-center justify-between">
        <h2 className="font-playfair text-cream text-xl">
          {existingSpot ? 'Edit Spot' : 'New Spot'}
        </h2>
        <button type="button" onClick={onCancel} className="text-cream/40 hover:text-cream text-xl">×</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Coffee shop name"
            className="input-field w-full"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding}
              className="btn-secondary text-xs px-2 whitespace-nowrap"
            >
              {geocoding ? '…' : 'Detect'}
            </button>
          </div>
          <p className="text-cream/30 text-xs mt-1">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        </div>

        {/* Vibe */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Vibe</label>
          <div className="flex gap-2 flex-wrap">
            {VIBES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVibe(vibe === v ? '' : v)}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition ${
                  vibe === v ? 'bg-caramel text-espresso' : 'border border-caramel/30 text-cream/60 hover:border-caramel'
                }`}
              >
                <span className="text-base">{VIBE_SYMBOLS[v]}</span>
                {VIBE_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(rating === star ? 0 : star)}
                className={`text-2xl transition ${star <= rating ? 'text-caramel' : 'text-caramel/20 hover:text-caramel/50'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Philosophy quote */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Philosophy Quote</label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={2}
            placeholder="A thought that pairs with this place…"
            className="input-field w-full resize-none font-lora italic"
          />
        </div>

        {/* Notes (markdown) */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Notes (markdown)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Ambient music, menu notes, best seat…"
            className="input-field w-full resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="wifi, quiet, matcha, window-seat"
            className="input-field w-full"
          />
        </div>

        {/* Visit date */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Visited</label>
          <input
            type="date"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
            className="input-field w-full"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Photos</label>
          <PhotoGallery photos={photos} onPhotosChange={setPhotos} editable />
        </div>
      </div>

      <div className="p-4 border-t border-caramel/20 flex gap-3">
        <button type="submit" className="btn-primary flex-1">
          {existingSpot ? 'Save Changes' : 'Add Spot'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
