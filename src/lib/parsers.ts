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
  // Detect Google Takeout format (has nested Location in properties)
  const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
  const isGoogleTakeout = features[0]?.properties?.Location !== undefined || features[0]?.properties?.Title !== undefined;
  if (isGoogleTakeout) return parseGoogleTakeout(geojson);

  return features
    .filter((f: GeoJSONFeature) => f.geometry?.type === 'Point')
    .map((f: GeoJSONFeature) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties ?? {};
      return {
        name: p.name ?? p.Title ?? 'Unnamed',
        address: p.address,
        lat,
        lng,
        notes: p.notes ?? p.description,
        philosophy_quote: p.philosophy_quote,
        vibe: p.vibe,
        list_type: p.list_type,
        rating: p.rating ? parseInt(p.rating) : undefined,
        tags: p.tags,
        visited_at: p.visited_at,
      };
    });
}

export function parseGoogleTakeout(geojson: GoogleTakeoutGeoJSON): ImportRow[] {
  const features: GoogleTakeoutFeature[] = geojson.type === 'FeatureCollection' ? geojson.features : [];
  return features
    .filter((f) => f.geometry?.type === 'Point')
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties ?? {};
      const loc = p.Location ?? {};
      return {
        name: p.Title ?? loc['Business Name'] ?? 'Unnamed',
        address: loc.Address,
        lat,
        lng,
        notes: p.Comment,
        list_type: 'wantto' as const,
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

/** Server-safe KML parser — uses regex, no DOMParser */
export function parseKMLServer(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const pmRegex = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm: RegExpExecArray | null;
  while ((pm = pmRegex.exec(text)) !== null) {
    const block = pm[0];
    const nameMatch = block.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/);
    const coordMatch = block.match(/<coordinates>\s*([-\d.]+),([-\d.]+)/);
    if (!coordMatch) continue;
    const lng = parseFloat(coordMatch[1]);
    const lat = parseFloat(coordMatch[2]);
    if (isNaN(lat) || isNaN(lng)) continue;
    const name = nameMatch ? nameMatch[1].trim() : 'Unnamed';
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    rows.push({ name, notes: descMatch ? descMatch[1].trim() : undefined, lat, lng });
  }
  return rows;
}

interface GeoJSONFeature {
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, string> | null;
}

interface GoogleTakeoutFeature {
  geometry: { type: string; coordinates: number[] };
  properties: {
    Title?: string;
    Comment?: string;
    Location?: { Address?: string; 'Business Name'?: string };
  } | null;
  type: string;
}

interface GoogleTakeoutGeoJSON {
  type: string;
  features: GoogleTakeoutFeature[];
}
