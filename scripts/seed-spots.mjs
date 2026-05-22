import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const dataPath = path.join(process.cwd(), 'data', 'spots.json');
const spots = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
const sql = postgres(connectionString, { max: 1 });

try {
  for (const spot of spots) {
    await sql`
      insert into coffee_spots (
        name,
        address,
        lat,
        lng,
        notes,
        philosophy_quote,
        vibe,
        list_type,
        rating,
        tags,
        photos,
        visited_at,
        created_at,
        updated_at
      )
      values (
        ${spot.name},
        ${spot.address},
        ${spot.lat},
        ${spot.lng},
        ${spot.notes},
        ${spot.philosophy_quote},
        ${spot.vibe},
        ${spot.list_type ?? 'favourite'},
        ${spot.rating},
        ${sql.json(spot.tags ?? [])},
        ${sql.json(spot.photos ?? [])},
        ${spot.visited_at ? new Date(spot.visited_at) : null},
        ${spot.created_at ? new Date(spot.created_at) : new Date()},
        ${spot.updated_at ? new Date(spot.updated_at) : new Date()}
      )
    `;
  }

  console.log(`Seeded ${spots.length} coffee spots.`);
} finally {
  await sql.end();
}
