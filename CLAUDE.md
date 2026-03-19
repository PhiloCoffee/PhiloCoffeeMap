# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:studio    # Open Drizzle Studio (web UI for DB)

# Assets
npm run icons        # Regenerate SVG icon assets
```

No test framework is configured.

## Environment Variables

Requires `.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=...
DATABASE_URL=postgresql://...
```

Optional (photo storage via Cloudflare R2):
```
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
```

## Architecture

PhiloCoffeeMap is a full-stack Next.js app for mapping personal coffee shop experiences. Stack: Next.js 16 + React 19, PostgreSQL via Supabase, Drizzle ORM, Google Maps JS API, SWR, Tailwind CSS v4.

### Data Flow

`page.tsx` is the central orchestrator — it owns all state coordination between the map, sidebar, and tab views:

- **`useSpots()`** (`src/hooks/useSpots.ts`) — SWR hook wrapping all CRUD operations against `/api/spots`
- **`useMapState()`** (`src/hooks/useMapState.ts`) — UI state: selected spot, pending marker position, sidebar view (`list | detail | form`), add mode
- **`CoffeeMap`** — loaded dynamically (no SSR) with `next/dynamic`; emits `onMapClick` and `onSpotClick` events up to `page.tsx`
- **Sidebar** — conditionally renders `SpotList`, `SpotDetail`, or `SpotForm` based on `sidebarView`

Spot creation flow: map click → `startAddMode(lat, lng)` → form renders with `pendingMarker` coords → submit → POST `/api/spots` → SWR revalidates → new pin appears.

### Database Schema

Single table `coffee_spots` in `src/lib/db/schema.ts`. Key fields:
- `lat`/`lng` — required coordinates
- `vibe` — `study | chill | social | contemplative` (symbols: λ φ ∞ Ω)
- `list_type` — `favourite | friend | wantto` (drives pin icon variant)
- `rating` — integer 0–5
- `tags` / `photos` — JSONB arrays
- `visited_at` — optional; spots without this are "want to visit"

Migrations live in `drizzle/migrations/`. After changing `schema.ts`, run `db:generate` then `db:migrate`.

### API Routes

- `GET/POST /api/spots` — list all spots (ordered by `created_at desc`) / create
- `GET/PUT/DELETE /api/spots/[id]` — single spot operations

### Key Type Definitions

All domain types and constants (vibe symbols, list type labels, pin icons) are centralized in `src/types/index.ts`. Check here before adding new enums or labels.

### Styling

Tailwind v4 with custom CSS variables. Core palette:
- `espresso` (`#1C0A00`) — dark background
- `caramel` (`#C4783A`) — accent/interactive
- `cream` (`#E8D5B7`) — text/light elements

Fonts: Playfair (headings), Lora (body/quotes).

### Google Maps

`CoffeeMap` uses `@vis.gl/react-google-maps` with Advanced Markers. Custom pins rendered via `CoffeePin` — three SVG variants keyed to `list_type`. The Map ID (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`) is required for Advanced Markers.
