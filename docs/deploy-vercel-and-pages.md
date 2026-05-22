# Deploy PhiloCoffeeMap

This app should be hosted as a real Next.js server on Vercel. GitHub Pages can host a friendly `/map` redirect, but it cannot host the app itself because the map needs API routes and a database.

## 1. Create the database

Use Supabase Postgres and copy its pooled connection string into `DATABASE_URL`.

Required Vercel environment variables:

```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=...
```

Optional photo storage:

```bash
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
```

## 2. Deploy the app to Vercel

1. Import `https://github.com/PhiloCoffee/PhiloCoffeeMap` in Vercel.
2. Framework preset: Next.js.
3. Add the environment variables above.
4. Deploy.

After the first deploy, run migrations and seed the current local spots from your machine:

```bash
npm run db:migrate
npm run db:seed
```

The app uses Postgres when `DATABASE_URL` exists. Locally, if `DATABASE_URL` is absent, it falls back to `data/spots.json`.

## 3. Add the club-site redirect

In the `PhiloCoffee/philocoffee.github.io` repo, add:

```text
map/index.html
```

Use this content, replacing the Vercel URL after deployment:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=https://YOUR-VERCEL-APP.vercel.app" />
    <link rel="canonical" href="https://YOUR-VERCEL-APP.vercel.app" />
    <title>PhiloCoffeeMap</title>
  </head>
  <body>
    <p>Opening <a href="https://YOUR-VERCEL-APP.vercel.app">PhiloCoffeeMap</a>...</p>
  </body>
</html>
```

Then `https://philocoffee.github.io/map/` becomes the friendly public entry point.
