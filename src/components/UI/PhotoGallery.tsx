'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange?: (photos: string[]) => void;
  editable?: boolean;
}

export default function PhotoGallery({ photos, onPhotosChange, editable = false }: PhotoGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!onPhotosChange) return;
      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of acceptedFiles) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.url) urls.push(data.url);
        }
        onPhotosChange([...photos, ...urls]);
      } finally {
        setUploading(false);
      }
    },
    [photos, onPhotosChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: !editable || uploading,
  });

  const removePhoto = (url: string) => {
    onPhotosChange?.(photos.filter((p) => p !== url));
  };

  return (
    <div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((url) => (
            <div key={url} className="relative group aspect-square">
              <img
                src={url}
                alt="Coffee spot"
                className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition"
                onClick={() => setLightbox(url)}
              />
              {editable && (
                <button
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 bg-espresso text-cream rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-caramel bg-caramel/10' : 'border-roasted hover:border-caramel'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-cream/60 text-sm font-lora">
            {uploading ? 'Uploading…' : isDragActive ? 'Drop photos here…' : 'Drag photos or click to browse'}
          </p>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full size" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
