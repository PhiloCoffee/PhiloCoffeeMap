'use client';
import { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import PhotoGallery from '@/components/UI/PhotoGallery';
import EspressoLoader from '@/components/UI/EspressoLoader';
import type { CoffeeSpot, CoffeeSpotInput, Vibe, ListType } from '@/types';
import { VIBE_LABELS, VIBE_SYMBOLS, LIST_TYPE_LABELS, LIST_TYPE_PINS } from '@/types';

const VIBES: Vibe[] = ['study', 'chill', 'social', 'contemplative'];
const LIST_TYPES: ListType[] = ['favourite', 'friend', 'wantto'];

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
  const [listType, setListType] = useState<ListType>(existingSpot?.list_type ?? 'favourite');
  const [rating, setRating] = useState(existingSpot?.rating ?? 0);
  const [tags, setTags] = useState((existingSpot?.tags ?? []).join(', '));
  const [photos, setPhotos] = useState<string[]>(existingSpot?.photos ?? []);
  const [visitedAt, setVisitedAt] = useState(
    existingSpot?.visited_at ? existingSpot.visited_at.slice(0, 10) : ''
  );
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Internal lat/lng: can be updated by Places Autocomplete
  const [lat, setLat] = useState(existingSpot?.lat ?? initialLat ?? 25.0);
  const [lng, setLng] = useState(existingSpot?.lng ?? initialLng ?? 121.5);

  // Places Autocomplete
  const placesLib = useMapsLibrary('places');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!placesLib || !nameInputRef.current) return;

    const ac = new placesLib.Autocomplete(nameInputRef.current, {
      types: ['establishment'],
      fields: ['name', 'formatted_address', 'geometry'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.name) setName(place.name);
      if (place.formatted_address) setAddress(place.formatted_address);
      if (place.geometry?.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
      }
    });
  }, [placesLib]);

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
        list_type: listType,
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
        {/* Name — with Places Autocomplete */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">Name *</label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Search coffee shop…"
            className="input-field w-full"
          />
          {placesLib && (
            <p className="text-cream/30 text-xs mt-1">Type to search for a coffee shop</p>
          )}
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

        {/* List type */}
        <div>
          <label className="block text-cream/70 text-xs mb-1">List</label>
          <div className="flex gap-2">
            {LIST_TYPES.map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setListType(lt)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition flex-1 justify-center ${
                  listType === lt ? 'bg-caramel text-espresso' : 'border border-caramel/30 text-cream/60 hover:border-caramel'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LIST_TYPE_PINS[lt]} alt={lt} width={10} height={13} />
                {LIST_TYPE_LABELS[lt]}
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
