'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { ImportRow } from '@/types';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [preview, setPreview] = useState<{ rows: ImportRow[]; total: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('preview', 'true');
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/geo+json': ['.geojson'], 'application/json': ['.json'], 'application/vnd.google-earth.kml+xml': ['.kml'] },
    maxFiles: 1,
  });

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onImported();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-roasted border border-caramel/30 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-caramel/20">
          <h2 className="font-playfair text-cream text-lg">Import Spots</h2>
          <button onClick={onClose} className="text-cream/60 hover:text-cream text-xl">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {!preview && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-caramel bg-caramel/10' : 'border-caramel/30 hover:border-caramel'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-symbol-gold text-4xl mb-3">φ</div>
              <p className="text-cream font-lora">Drop a CSV, GeoJSON, or KML file</p>
              <p className="text-cream/50 text-sm mt-1">or click to browse</p>
            </div>
          )}

          {loading && <p className="text-cream/60 text-center font-lora italic">Processing…</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {preview && (
            <div>
              <p className="text-cream/70 text-sm mb-2 font-lora">
                Found {preview.total} spots. Showing first {preview.rows.length}:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-cream/80">
                  <thead>
                    <tr className="border-b border-caramel/20">
                      <th className="text-left py-1 px-2 text-caramel">Name</th>
                      <th className="text-left py-1 px-2 text-caramel">Lat</th>
                      <th className="text-left py-1 px-2 text-caramel">Lng</th>
                      <th className="text-left py-1 px-2 text-caramel">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-caramel/10 hover:bg-caramel/5">
                        <td className="py-1 px-2">{row.name}</td>
                        <td className="py-1 px-2">{row.lat.toFixed(4)}</td>
                        <td className="py-1 px-2">{row.lng.toFixed(4)}</td>
                        <td className="py-1 px-2 max-w-xs truncate">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-caramel/20 flex gap-3 justify-end">
          {preview && (
            <button
              onClick={() => { setPreview(null); setFile(null); }}
              className="px-4 py-2 text-cream/60 hover:text-cream text-sm"
            >
              Change file
            </button>
          )}
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Importing…' : `Import ${preview.total} spots`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
