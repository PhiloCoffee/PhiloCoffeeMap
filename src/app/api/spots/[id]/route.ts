import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coffeeSpots } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [spot] = await db.select().from(coffeeSpots).where(eq(coffeeSpots.id, parseInt(id)));
    if (!spot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(spot);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch spot' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const [spot] = await db
      .update(coffeeSpots)
      .set({
        name: body.name,
        address: body.address ?? null,
        lat: body.lat,
        lng: body.lng,
        notes: body.notes ?? null,
        philosophy_quote: body.philosophy_quote ?? null,
        vibe: body.vibe ?? null,
        list_type: body.list_type ?? 'favourite',
        rating: body.rating ?? null,
        tags: body.tags ?? [],
        photos: body.photos ?? [],
        visited_at: body.visited_at ? new Date(body.visited_at) : null,
        updated_at: new Date(),
      })
      .where(eq(coffeeSpots.id, parseInt(id)))
      .returning();
    if (!spot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(spot);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update spot' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.delete(coffeeSpots).where(eq(coffeeSpots.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete spot' }, { status: 500 });
  }
}
