import { NextRequest, NextResponse } from 'next/server';
import { parseKMLServer } from '@/lib/parsers';
import type { ImportRow } from '@/types';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const { url }: { url: string } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  let finalUrl = url.trim();
  try {
    const res = await fetch(url.trim(), { redirect: 'follow', headers: { 'User-Agent': BROWSER_UA } });
    finalUrl = res.url;
  } catch {
    return NextResponse.json({ error: 'Could not reach that URL.' }, { status: 500 });
  }

  // ── Google My Maps (maps/d/) — reliable KML export ────────────────────────
  const myMapMatch = finalUrl.match(/\/maps\/d\/([^/?#]+)/);
  if (myMapMatch) {
    const mid = myMapMatch[1];
    try {
      const kmlRes = await fetch(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, {
        headers: { 'User-Agent': BROWSER_UA },
      });
      if (kmlRes.ok) {
        const rows = parseKMLServer(await kmlRes.text());
        if (rows.length > 0) return NextResponse.json({ rows, source: 'mymaps_kml' });
      }
    } catch { /* fall through */ }
    return NextResponse.json(
      { error: 'Found a Google My Maps link but KML export failed. Make sure the map is Public.' },
      { status: 422 }
    );
  }

  // ── All other Google Maps URLs — headless browser ─────────────────────────
  try {
    const rows = await scrapeWithHeadlessBrowser(finalUrl);
    if (rows.length > 0) return NextResponse.json({ rows, source: 'headless' });
    return NextResponse.json({ error: 'Page loaded but no places found. Is the list public?' }, { status: 422 });
  } catch (err) {
    console.error('[import-url]', err);
    return NextResponse.json({ error: 'Could not load the page. Is it a public list?' }, { status: 422 });
  }
}

async function scrapeWithHeadlessBrowser(url: string): Promise<ImportRow[]> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_UA);
    await page.setViewport({ width: 1280, height: 900 });

    // Block heavy resources to speed things up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
    await sleep(2500);

    // ── Step 1: If Google Maps shows the list as a summary card, click into it
    // e.g. "Tony King · 86 个地点 · 共享列表" is a summary card, not a place
    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-result-index]'));
      for (const card of cards) {
        const text = card.textContent ?? '';
        if (/\d+\s*(个地点|places?|locations?|地点)/i.test(text)) {
          // Find the clickable button inside the card
          const btn = card.querySelector('button, a') as HTMLElement | null;
          if (btn) { btn.click(); return true; }
          (card as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      // Wait for the list detail view to load
      await sleep(3000);
      try {
        await page.waitForFunction(
          () => document.querySelectorAll('[role="article"], [role="listitem"]').length > 2,
          { timeout: 10_000 }
        );
      } catch { /* might already be loaded */ }
      await sleep(1000);
    }

    // ── Step 2: Scroll the results panel to trigger lazy-loading of all items
    await page.evaluate(async () => {
      // Google Maps left panel selectors (varies by page type)
      const panel =
        document.querySelector('[role="feed"]') ??
        document.querySelector('[aria-label*="Results"]') ??
        document.querySelector('[aria-label*="results"]') ??
        document.querySelector('.m6QErb') ??
        document.querySelector('[data-result-index]')?.parentElement;

      if (!panel) return;
      for (let i = 0; i < 30; i++) {
        panel.scrollTop += 400;
        await new Promise((r) => setTimeout(r, 300));
      }
    });
    await sleep(1500);

    // ── Step 3: Extract place names from the rendered list
    const scraped: { name: string; address?: string }[] = await page.evaluate(() => {
      const results: { name: string; address?: string }[] = [];
      const seen = new Set<string>();

      /** Heuristic: is this text a real place name vs. UI noise? */
      function isNoise(text: string) {
        if (text.length < 2 || text.length > 120) return true;
        // Skip list-summary patterns like "86 个地点·共享列表", "Shared list", etc.
        if (/\d+\s*(个地点|places?|locations?)/i.test(text)) return true;
        if (/共享列表|shared list|saved places/i.test(text)) return true;
        // Skip common UI strings
        if (/^(google maps|saved|lists?|directions|search|layers|menu|更多|路线|搜索|open|close|back|photos?)$/i.test(text)) return true;
        return false;
      }

      function addResult(name: string, address?: string) {
        const key = name.toLowerCase().trim();
        if (!seen.has(key) && !isNoise(name)) {
          seen.add(key);
          results.push({ name: name.trim(), address: address?.trim() });
        }
      }

      // Strategy A: role=article or role=listitem cards (list detail view)
      const cards = document.querySelectorAll('[role="article"], [role="listitem"]');
      cards.forEach((card) => {
        // Place name is the first significant heading inside the card
        const heading =
          card.querySelector('[role="heading"]') ??
          card.querySelector('h2, h3') ??
          card.querySelector('.fontHeadlineSmall, .qBF1Pd, .NrDZNb');
        const name = heading?.textContent?.trim();
        if (!name) return;

        // Try to get address from a sub-element
        const addressEl = card.querySelector('.W4Efsd, .UaQhfb, address');
        const address = addressEl?.textContent?.trim();

        addResult(name, address);
      });

      // Strategy B: if cards found nothing useful, fall back to all headings
      // but exclude the list-summary patterns more aggressively
      if (results.length === 0) {
        document.querySelectorAll('[role="heading"], h2, h3').forEach((el) => {
          const name = el.textContent?.trim() ?? '';
          addResult(name);
        });
      }

      return results;
    });

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
