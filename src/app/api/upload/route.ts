import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadToR2 } from '@/lib/r2';

const USE_R2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    if (USE_R2) {
      const url = await uploadToR2(key, buffer, file.type);
      return NextResponse.json({ url });
    }

    // Local fallback
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filename = key.replace('photos/', '');
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
