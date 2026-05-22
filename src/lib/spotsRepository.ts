import { desc, eq } from 'drizzle-orm';
import { readFileStorage, writeFileStorage } from '@/lib/fileStorage';
import type { CoffeeSpot, CoffeeSpotInput } from '@/types';

function serializeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toSpot(row: {
  id: number;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  notes?: string | null;
  philosophy_quote?: string | null;
  vibe?: string | null;
  list_type?: string | null;
  rating?: number | null;
  tags?: string[] | null;
  photos?: string[] | null;
  visited_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}): CoffeeSpot {
  return {
    ...row,
    vibe: row.vibe as CoffeeSpot['vibe'],
    list_type: row.list_type as CoffeeSpot['list_type'],
    visited_at: serializeDate(row.visited_at),
    created_at: serializeDate(row.created_at) ?? new Date().toISOString(),
    updated_at: serializeDate(row.updated_at) ?? new Date().toISOString(),
  };
}

function shouldUseDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

async function getDb() {
  const [{ db }, { coffeeSpots }] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/db/schema'),
  ]);
  return { db, coffeeSpots };
}

function inputToRow(data: CoffeeSpotInput) {
  return {
    name: data.name,
    address: data.address ?? null,
    lat: data.lat,
    lng: data.lng,
    notes: data.notes ?? null,
    philosophy_quote: data.philosophy_quote ?? null,
    vibe: data.vibe ?? null,
    list_type: data.list_type ?? 'favourite',
    rating: data.rating ?? null,
    tags: data.tags ?? [],
    photos: data.photos ?? [],
    visited_at: data.visited_at ? new Date(data.visited_at) : null,
    updated_at: new Date(),
  };
}

export async function listSpots() {
  if (!shouldUseDatabase()) return readFileStorage();

  const { db, coffeeSpots } = await getDb();
  const rows = await db.select().from(coffeeSpots).orderBy(desc(coffeeSpots.created_at));
  return rows.map(toSpot);
}

export async function createSpot(data: CoffeeSpotInput) {
  if (!shouldUseDatabase()) {
    const spots = await readFileStorage();
    const now = new Date().toISOString();
    const newId = spots.length > 0 ? Math.max(...spots.map((s) => s.id)) + 1 : 1;
    const spot: CoffeeSpot = {
      id: newId,
      name: data.name,
      address: data.address ?? null,
      lat: data.lat,
      lng: data.lng,
      notes: data.notes ?? null,
      philosophy_quote: data.philosophy_quote ?? null,
      vibe: data.vibe ?? null,
      list_type: data.list_type ?? 'favourite',
      rating: data.rating ?? null,
      tags: data.tags ?? [],
      photos: data.photos ?? [],
      visited_at: data.visited_at ?? null,
      created_at: now,
      updated_at: now,
    };
    spots.unshift(spot);
    await writeFileStorage(spots);
    return spot;
  }

  const { db, coffeeSpots } = await getDb();
  const [spot] = await db.insert(coffeeSpots).values(inputToRow(data)).returning();
  return toSpot(spot);
}

export async function getSpot(id: number) {
  if (!shouldUseDatabase()) {
    const spots = await readFileStorage();
    return spots.find((s) => s.id === id) ?? null;
  }

  const { db, coffeeSpots } = await getDb();
  const [spot] = await db.select().from(coffeeSpots).where(eq(coffeeSpots.id, id)).limit(1);
  return spot ? toSpot(spot) : null;
}

export async function updateSpot(id: number, data: CoffeeSpotInput) {
  if (!shouldUseDatabase()) {
    const spots = await readFileStorage();
    const idx = spots.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated: CoffeeSpot = {
      ...spots[idx],
      name: data.name,
      address: data.address ?? null,
      lat: data.lat,
      lng: data.lng,
      notes: data.notes ?? null,
      philosophy_quote: data.philosophy_quote ?? null,
      vibe: data.vibe ?? null,
      list_type: data.list_type ?? 'favourite',
      rating: data.rating ?? null,
      tags: data.tags ?? [],
      photos: data.photos ?? [],
      visited_at: data.visited_at ?? null,
      updated_at: new Date().toISOString(),
    };
    spots[idx] = updated;
    await writeFileStorage(spots);
    return updated;
  }

  const { db, coffeeSpots } = await getDb();
  const [spot] = await db
    .update(coffeeSpots)
    .set(inputToRow(data))
    .where(eq(coffeeSpots.id, id))
    .returning();
  return spot ? toSpot(spot) : null;
}

export async function deleteSpot(id: number) {
  if (!shouldUseDatabase()) {
    const spots = await readFileStorage();
    const filtered = spots.filter((s) => s.id !== id);
    await writeFileStorage(filtered);
    return filtered.length !== spots.length;
  }

  const { db, coffeeSpots } = await getDb();
  const deleted = await db.delete(coffeeSpots).where(eq(coffeeSpots.id, id)).returning();
  return deleted.length > 0;
}
