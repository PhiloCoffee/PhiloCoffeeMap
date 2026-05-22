import { NextRequest, NextResponse } from 'next/server';
import { deleteSpot, getSpot, updateSpot } from '@/lib/spotsRepository';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const spot = await getSpot(parseInt(id));
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
    const updated = await updateSpot(parseInt(id), body);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update spot' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteSpot(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete spot' }, { status: 500 });
  }
}
