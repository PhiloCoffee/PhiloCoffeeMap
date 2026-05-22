import { NextRequest, NextResponse } from 'next/server';
import { createSpot, listSpots } from '@/lib/spotsRepository';

export async function GET() {
  try {
    const spots = await listSpots();
    return NextResponse.json(spots);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch spots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const spot = await createSpot(body);
    return NextResponse.json(spot, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create spot' }, { status: 500 });
  }
}
