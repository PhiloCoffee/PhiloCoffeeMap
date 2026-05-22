import { NextRequest, NextResponse } from 'next/server';
import { createSpot } from '@/lib/spotsRepository';
import { parseCSV, parseGeoJSON, parseKML } from '@/lib/parsers';
import type { ImportRow, ListType, Vibe } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const previewOnly = formData.get('preview') === 'true';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();
    const name = file.name.toLowerCase();

    let rows: ImportRow[] = [];
    if (name.endsWith('.csv')) {
      rows = parseCSV(text);
    } else if (name.endsWith('.geojson') || name.endsWith('.json')) {
      rows = parseGeoJSON(text);
    } else if (name.endsWith('.kml')) {
      rows = parseKML(text);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (previewOnly) {
      return NextResponse.json({ rows: rows.slice(0, 20), total: rows.length });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found' }, { status: 400 });
    }

    const inserted = await Promise.all(rows.map((r) => createSpot({
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      notes: r.notes,
      philosophy_quote: r.philosophy_quote,
      vibe: r.vibe as Vibe | undefined,
      list_type: (r.list_type ?? 'wantto') as ListType,
      rating: r.rating,
      tags: r.tags ? r.tags.split(',').map((t) => t.trim()) : [],
      photos: [],
      visited_at: r.visited_at,
    })));

    return NextResponse.json({ inserted: inserted.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
