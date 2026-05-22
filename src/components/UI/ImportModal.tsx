'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { ImportRow, ListType } from '@/types';
import { LIST_TYPE_LABELS } from '@/types';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

const LIST_TYPES: ListType[] = ['favourite', 'friend', 'wantto'];

interface ImportDebugStep {
  goal: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  detail?: string;
}

type UrlResult =
  | { rows: ImportRow[]; source: string; debugSteps?: ImportDebugStep[] }
  | { names: string[]; source: string; debugSteps?: ImportDebugStep[] };

const PASTE_METADATA = new Set([
  'note',
  'coffee shop',
  'italian',
  'liquor store',
  'restaurant',
  'espresso bar',
  'chinese',
  'karaoke bar',
  'bowling alley',
  'department store',
  'clothing store',
  'greek',
  'fencing school',
  'police department',
]);

const COFFEE_CATEGORIES = new Set([
  'coffee shop',
  'cafe',
  'espresso bar',
]);

function isRating(line: string) {
  return /^\d(?:\.\d)?\([\d,]+\)$/.test(line);
}

function isPrice(line: string) {
  return /^\$[\d–-]*(?:\s*·.*)?$/.test(line) || /^\${1,4}$/.test(line);
}

function categoryFromLine(line: string) {
  const category = line.replace(/^·\s*/, '').trim();
  return /^[\p{L} &'-]+$/u.test(category) ? category.toLowerCase() : null;
}

function extractCoffeePlaceNames(text: string) {
  const names: string[] = [];
  const seen = new Set<string>();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const possibleName = lines[i].replace(/^·\s*/, '').trim();
    const lower = possibleName.toLowerCase();
    if (
      possibleName === '' ||
      lower === 'note' ||
      isRating(possibleName) ||
      isPrice(possibleName) ||
      PASTE_METADATA.has(lower)
    ) {
      continue;
    }

    const block = lines.slice(i + 1, i + 6).map((line) => line.replace(/^·\s*/, '').trim());
    const category = block.map(categoryFromLine).find((value): value is string => Boolean(value));
    if (category && !COFFEE_CATEGORIES.has(category)) continue;
    if (!category && !/\b(coffee|cafe|café|espresso)\b/i.test(possibleName)) continue;

    let name = possibleName;
    if (/^[A-Za-z .'-]+$/.test(possibleName) && lines[i + 1]?.toLowerCase() === 'new jersey') {
      name = `${possibleName}, New Jersey`;
      i++;
    }

    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }

  return names;
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [tab, setTab] = useState<'url' | 'file' | 'paste'>('url');

  // --- File import state ---
  const [preview, setPreview] = useState<{ rows: ImportRow[]; total: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // --- URL import state ---
  const [urlInput, setUrlInput] = useState('');
  const [urlListType, setUrlListType] = useState<ListType>('wantto');
  const [urlResult, setUrlResult] = useState<UrlResult | null>(null);
  const [urlGeocoded, setUrlGeocoded] = useState<{ results: ImportRow[]; failed: string[] } | null>(null);
  const [urlGuide, setUrlGuide] = useState<{ urlType: string; finalUrl: string; debugSteps?: ImportDebugStep[] } | null>(null);

  // --- Paste import state ---
  const [pasteText, setPasteText] = useState('');
  const [pasteListType, setPasteListType] = useState<ListType>('wantto');
  const [pasteResults, setPasteResults] = useState<{ results: ImportRow[]; failed: string[] } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- URL import handlers ---
  async function handleUrlFetch() {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    setUrlResult(null);
    setUrlGeocoded(null);
    setUrlGuide(null);
    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      // 422 = known failure — show guide instead of throwing
      if (res.status === 422) {
        setUrlGuide({
          urlType: data.urlType ?? 'unknown',
          finalUrl: data.finalUrl ?? urlInput,
          debugSteps: data.debugSteps,
        });
        return;
      }
      if (data.error) throw new Error(data.error);
      setUrlResult(data);
      // Geocode if names-only OR if headless scrape returned rows with lat=0
      const needsGeocode =
        ('names' in data && data.names.length > 0) ||
        ('rows' in data && data.source === 'headless' && data.rows.length > 0);
      if (needsGeocode) {
        const names =
          'names' in data
            ? data.names
            : (data as { rows: { name: string }[] }).rows.map((r) => r.name);
        const gRes = await fetch('/api/geocode-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names, list_type: urlListType }),
        });
        const gData = await gRes.json();
        if (gData.error) throw new Error(gData.error);
        setUrlGeocoded(gData);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlImport() {
    const rows = urlGeocoded
      ? urlGeocoded.results
      : urlResult && 'rows' in urlResult
        ? urlResult.rows.map((r) => ({ ...r, list_type: urlListType }))
        : [];
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      for (const row of rows) {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (!res.ok) throw new Error('Failed to save a spot');
      }
      onImported();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const urlRows = urlGeocoded
    ? urlGeocoded.results
    : urlResult && 'rows' in urlResult
      ? urlResult.rows
      : [];
  const urlFailed = urlGeocoded?.failed ?? [];
  const urlDebugSteps = urlResult?.debugSteps ?? urlGuide?.debugSteps ?? [];
  const extractedPasteNames = extractCoffeePlaceNames(pasteText);

  // --- File import handlers ---
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
    accept: {
      'text/csv': ['.csv'],
      'application/geo+json': ['.geojson'],
      'application/json': ['.json'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
    },
    maxFiles: 1,
  });

  async function handleFileImport() {
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

  // --- Paste import handlers ---
  async function handleGeocode() {
    const names = extractCoffeePlaceNames(pasteText);
    if (names.length === 0) return;
    setLoading(true);
    setError(null);
    setPasteResults(null);
    try {
      const res = await fetch('/api/geocode-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, list_type: pasteListType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPasteResults(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasteImport() {
    if (!pasteResults?.results.length) return;
    setLoading(true);
    setError(null);
    try {
      for (const row of pasteResults.results) {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (!res.ok) throw new Error('Failed to save a spot');
      }
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
      <div className="bg-roasted border border-caramel/30 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-caramel/20">
          <h2 className="font-playfair text-cream text-lg">Import Spots</h2>
          <button onClick={onClose} className="text-cream/60 hover:text-cream text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-caramel/20">
          <button
            onClick={() => { setTab('url'); setError(null); }}
            className={`px-5 py-2 text-sm font-lora transition-colors ${tab === 'url' ? 'text-caramel border-b-2 border-caramel' : 'text-cream/50 hover:text-cream'}`}
          >
            Google Maps URL
          </button>
          <button
            onClick={() => { setTab('paste'); setError(null); }}
            className={`px-5 py-2 text-sm font-lora transition-colors ${tab === 'paste' ? 'text-caramel border-b-2 border-caramel' : 'text-cream/50 hover:text-cream'}`}
          >
            Paste Names
          </button>
          <button
            onClick={() => { setTab('file'); setError(null); }}
            className={`px-5 py-2 text-sm font-lora transition-colors ${tab === 'file' ? 'text-caramel border-b-2 border-caramel' : 'text-cream/50 hover:text-cream'}`}
          >
            File (CSV / KML / JSON)
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* --- URL TAB --- */}
          {tab === 'url' && (
            <>
              {urlDebugSteps.length > 0 && (
                <div className="border border-caramel/20 rounded-lg p-3 space-y-2">
                  <p className="text-caramel text-xs font-bold uppercase tracking-wide">Debug goals</p>
                  <ol className="space-y-1">
                    {urlDebugSteps.map((step, i) => (
                      <li key={`${step.goal}-${i}`} className="text-xs font-lora text-cream/70 flex gap-2">
                        <span className={
                          step.status === 'passed' ? 'text-green-400' :
                          step.status === 'failed' ? 'text-red-400' :
                          step.status === 'skipped' ? 'text-cream/35' :
                          'text-amber-400'
                        }>
                          {step.status}
                        </span>
                        <span>
                          {step.goal}
                          {step.detail && <span className="text-cream/35"> - {step.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {!urlResult && !urlGuide && !loading && (
                <>
                  <div className="text-cream/60 text-sm font-lora space-y-1">
                    <p>Paste a Google Maps list or My Maps URL. The places will be fetched automatically.</p>
                    <p className="text-cream/40 text-xs">Works best with public <span className="text-caramel">Google My Maps</span> links (maps.google.com/maps/d/…).</p>
                  </div>

                  <div>
                    <label className="text-cream/60 text-xs uppercase tracking-wide block mb-1">Add to list</label>
                    <div className="flex gap-2">
                      {LIST_TYPES.map((lt) => (
                        <button
                          key={lt}
                          onClick={() => setUrlListType(lt)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${urlListType === lt ? 'bg-caramel text-espresso' : 'bg-caramel/10 text-cream/70 hover:bg-caramel/20'}`}
                        >
                          {LIST_TYPE_LABELS[lt]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlFetch()}
                    placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/d/..."
                    className="w-full bg-espresso border border-caramel/20 rounded-lg p-3 text-cream font-lora text-sm focus:outline-none focus:border-caramel placeholder:text-cream/25"
                  />
                </>
              )}

              {/* Guide shown when Google Maps list URL can't be scraped */}
              {urlGuide && (
                <div className="space-y-4">
                  <div className="bg-caramel/10 border border-caramel/30 rounded-lg p-3 text-sm font-lora text-cream/80">
                    {urlGuide.urlType === 'shortlink'
                      ? <p>This <strong className="text-caramel">Google Maps app short link</strong> does not expose its destination to the importer. Open it in Google Maps, copy the place name, then use Paste Names.</p>
                      : urlGuide.urlType === 'placelists'
                      ? <p>This is a <strong className="text-caramel">Google Saved Places list</strong>. Google loads its content with JavaScript, so it can&apos;t be read automatically. Use one of the methods below instead:</p>
                      : <p>Couldn&apos;t extract places from this URL. Try one of these instead:</p>
                    }
                  </div>

                  <div className="space-y-3">
                    <div className="border border-caramel/20 rounded-lg p-3 space-y-1">
                      <p className="text-caramel text-xs font-bold uppercase tracking-wide">Option A — Paste Names (fastest)</p>
                      <ol className="text-cream/70 text-xs font-lora space-y-0.5 list-decimal list-inside">
                        <li>Open your Google Maps list in the browser</li>
                        <li>Copy the coffee shop names (one per line)</li>
                        <li>Switch to the <button onClick={() => { setTab('paste'); setUrlGuide(null); setError(null); }} className="text-caramel underline">Paste Names tab</button> and paste them</li>
                      </ol>
                    </div>

                    <div className="border border-caramel/20 rounded-lg p-3 space-y-1">
                      <p className="text-caramel text-xs font-bold uppercase tracking-wide">Option B — Google Takeout (all saved places at once)</p>
                      <ol className="text-cream/70 text-xs font-lora space-y-0.5 list-decimal list-inside">
                        <li>Go to <span className="text-cream/50">takeout.google.com</span></li>
                        <li>Deselect all → select <strong>Maps</strong> only → Next</li>
                        <li>Download and extract the ZIP</li>
                        <li>Switch to the <button onClick={() => { setTab('file'); setUrlGuide(null); setError(null); }} className="text-caramel underline">File tab</button> and drop the <code className="text-caramel/80">Saved Places.json</code> file</li>
                      </ol>
                    </div>

                    {urlGuide.urlType !== 'placelists' && (
                      <div className="border border-caramel/20 rounded-lg p-3 space-y-1">
                        <p className="text-caramel text-xs font-bold uppercase tracking-wide">Option C — Use Google My Maps instead</p>
                        <p className="text-cream/70 text-xs font-lora">Create a custom map at <span className="text-cream/50">mymaps.google.com</span>, add your places, make it public — that URL will import automatically.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {urlResult && (
                <div className="space-y-3">
                  <p className="text-cream/70 text-sm font-lora">
                    {urlRows.length > 0
                      ? <>Found <strong className="text-cream">{urlRows.length}</strong> place{urlRows.length !== 1 ? 's' : ''}.
                          {urlFailed.length > 0 && <span className="text-amber-400 ml-2">{urlFailed.length} not resolved: {urlFailed.join(', ')}</span>}
                        </>
                      : loading
                      ? 'Geocoding places…'
                      : 'No places resolved.'}
                    {'names' in urlResult && !urlGeocoded && !loading && (
                      <span className="text-cream/40 ml-2">(found {urlResult.names.length} names, looking up coordinates…)</span>
                    )}
                  </p>
                  {urlRows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-cream/80">
                        <thead>
                          <tr className="border-b border-caramel/20">
                            <th className="text-left py-1 px-2 text-caramel">Name</th>
                            <th className="text-left py-1 px-2 text-caramel">Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {urlRows.map((row, i) => (
                            <tr key={i} className="border-b border-caramel/10 hover:bg-caramel/5">
                              <td className="py-1 px-2 font-medium">{row.name}</td>
                              <td className="py-1 px-2 text-cream/50 max-w-xs truncate">{row.address}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* --- PASTE TAB --- */}
          {tab === 'paste' && (
            <>
              {!pasteResults && (
                <>
                  <div className="text-cream/60 text-sm font-lora space-y-1">
                    <p>Paste place names or a copied Google Maps block. Ratings, prices, categories, and notes are ignored automatically.</p>
                    <p className="text-cream/40">Or for all your saved places at once, use <span className="text-caramel">Google Takeout</span> → export &quot;Saved&quot; → drop the JSON in the File tab.</p>
                  </div>

                  <div>
                    <label className="text-cream/60 text-xs uppercase tracking-wide block mb-1">Add to list</label>
                    <div className="flex gap-2">
                      {LIST_TYPES.map((lt) => (
                        <button
                          key={lt}
                          onClick={() => setPasteListType(lt)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${pasteListType === lt ? 'bg-caramel text-espresso' : 'bg-caramel/10 text-cream/70 hover:bg-caramel/20'}`}
                        >
                          {LIST_TYPE_LABELS[lt]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"Cafe Tolia\n4.8(455)\n$10-20\n· Coffee shop\n\nPeddler Coffee"}
                    rows={8}
                    className="w-full bg-espresso border border-caramel/20 rounded-lg p-3 text-cream font-lora text-sm resize-none focus:outline-none focus:border-caramel placeholder:text-cream/25"
                  />
                  {pasteText.trim() && (
                    <p className="text-cream/40 text-xs font-lora">
                      {extractedPasteNames.length} place{extractedPasteNames.length !== 1 ? 's' : ''} detected.
                    </p>
                  )}
                </>
              )}

              {pasteResults && (
                <div className="space-y-3">
                  <p className="text-cream/70 text-sm font-lora">
                    Found {pasteResults.results.length} place{pasteResults.results.length !== 1 ? 's' : ''}.
                    {pasteResults.failed.length > 0 && (
                      <span className="text-amber-400 ml-2">{pasteResults.failed.length} not found: {pasteResults.failed.join(', ')}</span>
                    )}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-cream/80">
                      <thead>
                        <tr className="border-b border-caramel/20">
                          <th className="text-left py-1 px-2 text-caramel">Name</th>
                          <th className="text-left py-1 px-2 text-caramel">Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pasteResults.results.map((row, i) => (
                          <tr key={i} className="border-b border-caramel/10 hover:bg-caramel/5">
                            <td className="py-1 px-2 font-medium">{row.name}</td>
                            <td className="py-1 px-2 text-cream/50 max-w-xs truncate">{row.address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* --- FILE TAB --- */}
          {tab === 'file' && (
            <>
              {!preview && (
                <>
                  <div className="text-cream/50 text-sm font-lora">
                    <p>Supports CSV, GeoJSON, KML, and <span className="text-caramel">Google Takeout</span> JSON (takeout.google.com → Saved Places).</p>
                  </div>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-caramel bg-caramel/10' : 'border-caramel/30 hover:border-caramel'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="text-symbol-gold text-4xl mb-3">φ</div>
                    <p className="text-cream font-lora">Drop a file here</p>
                    <p className="text-cream/50 text-sm mt-1">CSV, GeoJSON, KML, or Google Takeout JSON</p>
                  </div>
                </>
              )}

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
                          <th className="text-left py-1 px-2 text-caramel">Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-b border-caramel/10 hover:bg-caramel/5">
                            <td className="py-1 px-2">{row.name}</td>
                            <td className="py-1 px-2">{row.lat.toFixed(4)}</td>
                            <td className="py-1 px-2">{row.lng.toFixed(4)}</td>
                            <td className="py-1 px-2 max-w-xs truncate text-cream/50">{row.address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {loading && <p className="text-cream/60 text-center font-lora italic">Processing…</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-caramel/20 flex gap-3 justify-end">
          {tab === 'url' && (urlResult || urlGuide) && (
            <button
              onClick={() => { setUrlResult(null); setUrlGeocoded(null); setUrlGuide(null); setError(null); }}
              className="px-4 py-2 text-cream/60 hover:text-cream text-sm"
            >
              Try different URL
            </button>
          )}
          {tab === 'file' && preview && (
            <button
              onClick={() => { setPreview(null); setFile(null); }}
              className="px-4 py-2 text-cream/60 hover:text-cream text-sm"
            >
              Change file
            </button>
          )}
          {tab === 'paste' && pasteResults && (
            <button
              onClick={() => setPasteResults(null)}
              className="px-4 py-2 text-cream/60 hover:text-cream text-sm"
            >
              Edit names
            </button>
          )}

          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>

          {tab === 'url' && !urlResult && (
            <button
              onClick={handleUrlFetch}
              disabled={loading || !urlInput.trim()}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Fetching…' : 'Import from URL'}
            </button>
          )}
          {tab === 'url' && urlResult && urlRows.length > 0 && !loading && (
            <button
              onClick={handleUrlImport}
              disabled={loading}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              Import {urlRows.length} spots
            </button>
          )}
          {tab === 'paste' && !pasteResults && (
            <button
              onClick={handleGeocode}
              disabled={loading || !pasteText.trim()}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Looking up…' : 'Find Places'}
            </button>
          )}
          {tab === 'paste' && pasteResults && pasteResults.results.length > 0 && (
            <button
              onClick={handlePasteImport}
              disabled={loading}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Importing…' : `Import ${pasteResults.results.length} spots`}
            </button>
          )}
          {tab === 'file' && preview && (
            <button
              onClick={handleFileImport}
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
