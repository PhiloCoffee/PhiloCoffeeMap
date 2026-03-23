import { NextRequest, NextResponse } from 'next/server';
import { parseKMLServer } from '@/lib/parsers';
import type { ImportRow } from '@/types';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function POST(req: NextRequest) {
  const { url }: { url: string } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  let finalUrl = url.trim();

  // ── Step 1: follow redirects to resolve short URLs ────────────────────────
  try {
    const res = await fetch(url.trim(), {
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA },
    });
    finalUrl = res.url;
  } catch {
    return NextResponse.json({ error: 'Could not reach that URL.' }, { status: 500 });
  }

  // ── Step 2: Google My Maps (maps/d/) — reliable KML export ───────────────
  const myMapMatch = finalUrl.match(/\/maps\/d\/([^/?#]+)/);
  if (myMapMatch) {
    const mid = myMapMatch[1];
    const kmlUrl = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
    try {
      const kmlRes = await fetch(kmlUrl, { headers: { 'User-Agent': BROWSER_UA } });
      if (kmlRes.ok) {
        const kmlText = await kmlRes.text();
        const rows = parseKMLServer(kmlText);
        if (rows.length > 0) return NextResponse.json({ rows, source: 'mymaps_kml' });
      }
    } catch { /* fall through */ }
    return NextResponse.json(
      { error: 'Found a Google My Maps link but could not fetch its KML. Make sure the map is set to Public.' },
      { status: 422 }
    );
  }

  // ── Step 3: Any Google Maps URL — render with headless browser ────────────
  try {
    const rows = await scrapeWithHeadlessBrowser(finalUrl);
    if (rows.length > 0) return NextResponse.json({ rows, source: 'headless' });
    return NextResponse.json(
      { error: 'Page loaded but no places were found. Make sure the list is public.' },
      { status: 422 }
    );
  } catch (err) {
    console.error('[import-url] headless scrape failed:', err);
    return NextResponse.json(
      { error: 'Could not load the page. Is it a public list?' },
      { status: 422 }
    );
  }
}

/**
 * Launch a real headless Chromium, navigate to the URL, wait for the Google
 * Maps list to render, then extract place cards from the DOM.
 *
 * Google Maps list pages are fully JS-rendered; a plain fetch returns an empty
 * shell. Running Chromium gives us the actual rendered DOM.
 */
async function scrapeWithHeadlessBrowser(url: string): Promise<ImportRow[]> {
  // Dynamic import so the module is only loaded server-side
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_UA);
    await page.setViewport({ width: 1280, height: 900 });

    // Block images/fonts/media to load faster
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Give JS a moment to settle after network is idle
    await new Promise((r) => setTimeout(r, 2000));

    // Extract place data from the rendered DOM.
    // Google Maps renders place cards as role="article" or role="listitem" elements.
    // Place names appear in h2/h3/[role=heading] within those cards, or as
    // the first strong text child. We collect candidates then filter noise.
    const scraped = await page.evaluate(() => {
      const results: { name: string; address?: string }[] = [];
      const seen = new Set<string>();

      // Strategy 1: role=article cards (list view)
      const articles = document.querySelectorAll('[role="article"], [role="listitem"]');
      articles.forEach((card) => {
        const heading =
          card.querySelector('[role="heading"]') ??
          card.querySelector('h2, h3') ??
          card.querySelector('.fontHeadlineSmall, .qBF1Pd');
        const name = heading?.textContent?.trim();
        if (!name || name.length < 2 || name.length > 100) return;

        const addressEl = card.querySelector(
          '.W4Efsd, .UaQhfb, [data-tooltip], address, [aria-label*="Address"]'
        );
        const address = addressEl?.textContent?.trim();

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ name, address });
        }
      });

      // Strategy 2: fall back to all headings if articles found nothing
      if (results.length === 0) {
        document.querySelectorAll('h2, h3, [role="heading"]').forEach((el) => {
          const name = el.textContent?.trim();
          if (!name || name.length < 2 || name.length > 100) return;
          const key = name.toLowerCase();
          // Skip obvious navigation/chrome headings
          if (/^(google maps|saved|lists?|directions|search|layers|menu)$/i.test(name)) return;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ name });
          }
        });
      }

      return results;
    });

    // lat/lng are 0 — the caller will geocode using the place names
    return scraped.map((r): ImportRow => ({
      name: r.name,
      address: r.address,
      lat: 0,
      lng: 0,
      list_type: 'wantto',
    }));
  } finally {
    await browser.close();
  }
}
