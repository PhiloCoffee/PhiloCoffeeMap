import Papa from 'papaparse';
import type { ImportRow } from '@/types';

export function parseCSV(text: string): ImportRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data
    .filter((row) => row.name && row.lat && row.lng)
    .map((row) => ({
      name: row.name,
      address: row.address,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      notes: row.notes,
      philosophy_quote: row.philosophy_quote,
      vibe: row.vibe,
      rating: row.rating ? parseInt(row.rating) : undefined,
      tags: row.tags,
      visited_at: row.visited_at,
    }));
}

export function parseGeoJSON(text: string): ImportRow[] {
  const geojson = JSON.parse(text);
  const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
  return features
    .filter((f: GeoJSONFeature) => f.geometry?.type === 'Point')
    .map((f: GeoJSONFeature) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties ?? {};
      return {
        name: p.name ?? p.title ?? 'Unnamed',
        address: p.address,
        lat,
        lng,
        notes: p.notes ?? p.description,
        philosophy_quote: p.philosophy_quote,
        vibe: p.vibe,
        rating: p.rating ? parseInt(p.rating) : undefined,
        tags: p.tags,
        visited_at: p.visited_at,
      };
    });
}

export function parseKML(text: string): ImportRow[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const placemarks = Array.from(doc.querySelectorAll('Placemark'));
  return placemarks
    .map((pm) => {
      const name = pm.querySelector('name')?.textContent ?? 'Unnamed';
      const description = pm.querySelector('description')?.textContent ?? '';
      const coordText = pm.querySelector('coordinates')?.textContent?.trim() ?? '';
      const [lngStr, latStr] = coordText.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { name, notes: description, lat, lng };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null) as ImportRow[];
}

interface GeoJSONFeature {
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, string> | null;
}
