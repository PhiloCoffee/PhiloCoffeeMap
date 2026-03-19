'use client';
import ReactMarkdown from 'react-markdown';
import PhilosophyQuote from '@/components/UI/PhilosophyQuote';
import PhotoGallery from '@/components/UI/PhotoGallery';
import type { CoffeeSpot, Vibe } from '@/types';
import { VIBE_LABELS, VIBE_SYMBOLS, LIST_TYPE_LABELS, LIST_TYPE_PINS } from '@/types';

interface SpotDetailProps {
  spot: CoffeeSpot;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? 'text-caramel text-lg' : 'text-caramel/20 text-lg'}>★</span>
      ))}
    </span>
  );
}

export default function SpotDetail({ spot, onClose, onEdit, onDelete }: SpotDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-caramel/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {spot.vibe && (
                <span className="text-symbol-gold text-xl">{VIBE_SYMBOLS[spot.vibe as Vibe]}</span>
              )}
              <h2 className="font-playfair text-cream text-xl font-semibold">{spot.name}</h2>
            </div>
            {spot.address && (
              <p className="text-cream/50 text-sm mt-1">{spot.address}</p>
            )}
          </div>
          <button onClick={onClose} className="text-cream/40 hover:text-cream text-xl flex-shrink-0">×</button>
        </div>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {spot.rating && <StarRating rating={spot.rating} />}
          {spot.list_type && (
            <span className="flex items-center gap-1 text-xs bg-caramel/20 text-caramel px-2 py-0.5 rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LIST_TYPE_PINS[spot.list_type]} alt={spot.list_type} width={10} height={13} />
              {LIST_TYPE_LABELS[spot.list_type]}
            </span>
          )}
          {spot.vibe && (
            <span className="text-xs bg-caramel/20 text-caramel px-2 py-0.5 rounded-full">
              {VIBE_LABELS[spot.vibe as Vibe]}
            </span>
          )}
          {spot.visited_at && (
            <span className="text-cream/40 text-xs">
              {new Date(spot.visited_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {spot.tags && spot.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {spot.tags.map((tag) => (
              <span key={tag} className="text-xs bg-caramel/10 text-caramel/80 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {spot.philosophy_quote && (
          <PhilosophyQuote quote={spot.philosophy_quote} />
        )}

        {spot.photos && spot.photos.length > 0 && (
          <PhotoGallery photos={spot.photos} editable={false} />
        )}

        {spot.notes && (
          <div className="prose prose-invert prose-sm max-w-none text-cream/80 font-lora">
            <ReactMarkdown>{spot.notes}</ReactMarkdown>
          </div>
        )}

        <div className="text-xs text-cream/30 pt-2 border-t border-caramel/10">
          <p>lat: {spot.lat.toFixed(6)}, lng: {spot.lng.toFixed(6)}</p>
          <p>Added {new Date(spot.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-caramel/20 flex gap-3">
        <button onClick={onEdit} className="btn-primary flex-1">Edit</button>
        <button
          onClick={() => {
            if (confirm(`Delete "${spot.name}"?`)) onDelete();
          }}
          className="btn-secondary flex-1 hover:bg-red-900/30 hover:border-red-700 hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
