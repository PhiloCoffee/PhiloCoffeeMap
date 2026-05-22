# Deploying PhiloCoffeeMap on Railway

PhiloCoffeeMap uses a local JSON file (`data/spots.json`) for storage. Railway is the recommended host because it supports persistent volumes — your spots survive redeploys and restarts.

## Prerequisites

- A [Railway account](https://railway.app) (free tier is sufficient for personal use)
- The repo pushed to GitHub

## Steps

### 1. Push to GitHub

Make sure all changes are committed and pushed:

```bash
git add .
git commit -m "add Railway deployment config"
git push origin main
```

### 2. Create a new Railway project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Authorize Railway to access your GitHub account if prompted
4. Select the **PhiloCoffeeMap** repository

Railway will detect `railway.toml` and start building using the `Dockerfile` automatically.

### 3. Set environment variables

In your Railway project, go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Your Google Maps Map ID |

Optional (only if using Cloudflare R2 for photo storage):

| Variable | Value |
|----------|-------|
| `R2_ENDPOINT` | Your R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public URL for uploaded files |

After adding variables, Railway will trigger a redeploy automatically.

### 4. Confirm the persistent volume

Railway mounts a volume at `/app/data` as declared in `railway.toml`. To verify:

1. Open your service in Railway
2. Go to the **Volumes** tab
3. Confirm a volume is mounted at `/app/data`

This is where `spots.json` lives. It persists across redeploys and restarts — your data is safe when you push new code.

> If the volume tab shows no volume, add one manually: **Volumes → Add Volume → Mount path: `/app/data`**

### 5. Access your app

Once the build succeeds, Railway assigns a public URL like `https://philocoffeemap-production.up.railway.app`. You can also set a custom domain under **Settings → Networking**.

Share this URL with friends — everyone writes to the same `spots.json` on the server.

## Updating the app

Just push to GitHub. Railway auto-deploys on every push to `main`.

```bash
git push origin main
# Railway picks it up automatically
```

## Accessing your data file

To download or back up `spots.json`:

1. Go to Railway dashboard → your service → **Volumes**
2. Use the Railway CLI to copy the file:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Open a shell in your running service
railway shell

# The file is at:
cat /app/data/spots.json
```

Or copy it out:

```bash
railway shell -- cat /app/data/spots.json > spots-backup.json
```

To share your spots with a friend on a different instance, send them this JSON file and have them place it at `data/spots.json` in their own deployment (or local dev).

## Local development

No Railway account needed locally. The app reads/writes `data/spots.json` directly in the project root:

```bash
npm run dev
```

Spots are saved to `data/spots.json` — you can commit this file to share your spots via Git, or keep it in `.gitignore` if you prefer it stays local.
