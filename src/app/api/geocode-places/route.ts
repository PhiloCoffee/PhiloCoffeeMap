import { NextRequest, NextResponse } from 'next/server';
import type { ImportRow } from '@/types';

interface PlacesTextSearchResult {
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
}

interface GeocodeResult {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
}

async function fetchGoogleJson(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_message ?? `Google API returned ${res.status}`);
  return data;
}

export async function POST(req: NextRequest) {
  const { names, list_type }: { names: string[]; list_type?: string } = await req.json();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 });

  const filtered = names.map((n) => n.trim()).filter(Boolean).slice(0, 50);
  if (filtered.length === 0) return NextResponse.json({ error: 'No place names provided' }, { status: 400 });

  const results: ImportRow[] = [];
  const failed: string[] = [];

  for (const name of filtered) {
    try {
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&key=${apiKey}`;
      const textSearchData = await fetchGoogleJson(textSearchUrl);

      if (textSearchData.status && textSearchData.status !== 'OK' && textSearchData.status !== 'ZERO_RESULTS') {
        throw new Error(textSearchData.error_message ?? textSearchData.status);
      }

      const place: PlacesTextSearchResult | undefined = textSearchData.results?.[0];
      if (place) {
        results.push({
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          list_type: list_type ?? 'wantto',
        });
        continue;
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(name)}&key=${apiKey}`;
      const geocodeData = await fetchGoogleJson(geocodeUrl);
      const geocode: GeocodeResult | undefined = geocodeData.results?.[0];
      if (geocode) {
        results.push({
          name,
          address: geocode.formatted_address,
          lat: geocode.geometry.location.lat,
          lng: geocode.geometry.location.lng,
          list_type: list_type ?? 'wantto',
        });
      } else {
        failed.push(name);
      }
    } catch {
      failed.push(name);
    }
  }

  return NextResponse.json({ results, failed });
}
