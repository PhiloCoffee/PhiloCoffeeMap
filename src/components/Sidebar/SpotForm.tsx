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

interface SpotFormDraft {
  name: string;
  address: string;
  notes: string;
  quote: string;
  vibe: Vibe | '';
  listType: ListType;
  rating: number;
  tags: string;
  photos: string[];
  visitedAt: string;
  lat: number;
  lng: number;
}

function reverseGeocode(lat: number, lng: number): Promise<string> {
  return fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`)
    .then((r) => r.json())
    .then((d) => d.results?.[0]?.formatted_address ?? '');
}

export default function SpotForm({ initialLat, initialLng, existingSpot, onSave, onCancel }: SpotFormProps) {
  const draftKey = existingSpot ? `philo-spot-form-edit-${existingSpot.id}` : 'philo-spot-form-new';
  const baseDraft: SpotFormDraft = {
    name: existingSpot?.name ?? '',
    address: existingSpot?.address ?? '',
    notes: existingSpot?.notes ?? '',
    quote: existingSpot?.philosophy_quote ?? '',
    vibe: existingSpot?.vibe ?? '',
    listType: existingSpot?.list_type ?? 'favourite',
    rating: existingSpot?.rating ?? 0,
    tags: (existingSpot?.tags ?? []).join(', '),
    photos: existingSpot?.photos ?? [],
    visitedAt: existingSpot?.visited_at ? existingSpot.visited_at.slice(0, 10) : '',
    lat: existingSpot?.lat ?? initialLat ?? 25.0,
    lng: existingSpot?.lng ?? initialLng ?? 121.5,
  };
  const [initialDraft] = useState<SpotFormDraft>(() => {
    if (typeof window === 'undefined') return baseDraft;
    const saved = window.sessionStorage.getItem(draftKey);
    if (!saved) return baseDraft;
    try {
      return { ...baseDraft, ...JSON.parse(saved) };
    } catch {
      return baseDraft;
    }
  });

  const [name, setName] = useState(initialDraft.name);
  const [address, setAddress] = useState(initialDraft.address);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [quote, setQuote] = useState(initialDraft.quote);
  const [vibe, setVibe] = useState<Vibe | ''>(initialDraft.vibe);
  const [listType, setListType] = useState<ListType>(initialDraft.listType);
  const [rating, setRating] = useState(initialDraft.rating);
  const [tags, setTags] = useState(initialDraft.tags);
  const [photos, setPhotos] = useState<string[]>(initialDraft.photos);
  const [visitedAt, setVisitedAt] = useState(initialDraft.visitedAt);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Internal lat/lng: can be updated by Places Autocomplete
  const [lat, setLat] = useState(initialDraft.lat);
  const [lng, setLng] = useState(initialDraft.lng);

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

  useEffect(() => {
    if (existingSpot || initialLat == null || initialLng == null) return;
    setLat(initialLat);
    setLng(initialLng);
  }, [existingSpot, initialLat, initialLng]);

  useEffect(() => {
    const draft: SpotFormDraft = {
      name,
      address,
      notes,
      quote,
      vibe,
      listType,
      rating,
      tags,
      photos,
      visitedAt,
      lat,
      lng,
    };
    window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, name, address, notes, quote, vibe, listType, rating, tags, photos, visitedAt, lat, lng]);

  function clearDraft() {
    window.sessionStorage.removeItem(draftKey);
  }

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
      clearDraft();
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    clearDraft();
    onCancel();
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
        <button type="button" onClick={handleCancel} className="text-cream/40 hover:text-cream text-xl">×</button>
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
        <button type="button" onClick={handleCancel} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
