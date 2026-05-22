import fs from 'fs/promises';
import path from 'path';
import type { CoffeeSpot } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'spots.json');

export async function readFileStorage(): Promise<CoffeeSpot[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as CoffeeSpot[];
  } catch {
    return [];
  }
}

export async function writeFileStorage(spots: CoffeeSpot[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(spots, null, 2), 'utf-8');
}
