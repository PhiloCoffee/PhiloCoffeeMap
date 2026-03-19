import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coffeeSpots } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const spots = await db.select().from(coffeeSpots).orderBy(desc(coffeeSpots.created_at));
    return NextResponse.json(spots);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch spots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [spot] = await db
      .insert(coffeeSpots)
      .values({
        name: body.name,
        address: body.address,
        lat: body.lat,
        lng: body.lng,
        notes: body.notes,
        philosophy_quote: body.philosophy_quote,
        vibe: body.vibe,
        list_type: body.list_type ?? 'favourite',
        rating: body.rating,
        tags: body.tags ?? [],
        photos: body.photos ?? [],
        visited_at: body.visited_at ? new Date(body.visited_at) : null,
      })
      .returning();
    return NextResponse.json(spot, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create spot' }, { status: 500 });
  }
}
