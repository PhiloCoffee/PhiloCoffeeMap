import { NextRequest, NextResponse } from 'next/server';
import { parseKMLServer } from '@/lib/parsers';
import type { ImportRow } from '@/types';
import type { Page } from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ImportDebugStep {
  goal: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  detail?: string;
}

function createDebugSteps(): ImportDebugStep[] {
  return [
    { goal: 'Resolve shared Google Maps URL', status: 'pending' },
    { goal: 'Detect import type', status: 'pending' },
    { goal: 'Extract place names or KML placemarks', status: 'pending' },
    { goal: 'Geocode names into coordinates', status: 'pending' },
    { goal: 'Save imported spots', status: 'pending' },
  ];
}

function extractMyMapsId(url: string) {
  const parsed = new URL(url);
  const mid = parsed.searchParams.get('mid');
  if (mid) return mid;
  const directMatch = parsed.pathname.match(/\/maps\/d\/(?!u\/)([^/?#]+)/);
  return directMatch?.[1] ?? null;
}

function getGoogleMapsUrlType(url: string) {
  const parsed = new URL(url);
  if (extractMyMapsId(url)) return 'Google My Maps link';
  if (parsed.pathname.includes('/maps/place/') || parsed.searchParams.has('q') || parsed.searchParams.has('query')) {
    return 'Google Maps place/address URL';
  }
  return 'Google Maps saved/list URL';
}

function extractMapsUrlFromHtml(html: string) {
  const decoded = html
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&');
  const match = decoded.match(/https:\/\/(?:www\.)?google\.[^"'\\\s]+\/maps[^"'\\\s<]+/i);
  return match ? decodeURIComponent(match[0]) : null;
}

async function resolveSharedGoogleMapsUrl(url: string) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  let resolvedUrl = res.url;
  if (resolvedUrl === url || new URL(resolvedUrl).hostname === 'maps.app.goo.gl') {
    const html = await res.text();
    resolvedUrl = extractMapsUrlFromHtml(html) ?? resolvedUrl;
  }

  return resolvedUrl;
}

export async function POST(req: NextRequest) {
  const { url }: { url: string } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  let finalUrl = url.trim();
  const debugSteps = createDebugSteps();

  try {
    finalUrl = await resolveSharedGoogleMapsUrl(url.trim());
    debugSteps[0] = { ...debugSteps[0], status: 'passed', detail: finalUrl };
  } catch {
    debugSteps[0] = { ...debugSteps[0], status: 'failed', detail: 'The server could not follow the shared URL.' };
    return NextResponse.json({ error: 'Could not reach that URL.', debugSteps }, { status: 500 });
  }

  if (new URL(finalUrl).hostname === 'maps.app.goo.gl') {
    debugSteps[1] = { ...debugSteps[1], status: 'failed', detail: 'Google did not expose the destination for this app short link.' };
    debugSteps[2] = { ...debugSteps[2], status: 'skipped', detail: 'Open the link in Google Maps and copy the place name or use Takeout.' };
    return NextResponse.json(
      {
        error: 'This maps.app.goo.gl short link cannot be read directly. Open it in Google Maps and paste the place name, or use Google Takeout for saved places.',
        urlType: 'shortlink',
        finalUrl,
        debugSteps,
      },
      { status: 422 }
    );
  }

  const myMapsId = extractMyMapsId(finalUrl);
  if (myMapsId) {
    debugSteps[1] = { ...debugSteps[1], status: 'passed', detail: 'Google My Maps link' };

    try {
      const kmlRes = await fetch(`https://www.google.com/maps/d/kml?mid=${myMapsId}&forcekml=1`, {
        headers: { 'User-Agent': BROWSER_UA },
      });
      if (kmlRes.ok) {
        const rows = parseKMLServer(await kmlRes.text());
        if (rows.length > 0) {
          debugSteps[2] = { ...debugSteps[2], status: 'passed', detail: `${rows.length} placemark(s)` };
          debugSteps[3] = { ...debugSteps[3], status: 'skipped', detail: 'KML already contains coordinates.' };
          return NextResponse.json({ rows, source: 'mymaps_kml', debugSteps });
        }
      }
    } catch {
      // Fall through to the guided failure below.
    }

    debugSteps[2] = { ...debugSteps[2], status: 'failed', detail: 'KML export returned no placemarks.' };
    return NextResponse.json(
      { error: 'Found a Google My Maps link but KML export failed. Make sure the map is Public.', debugSteps },
      { status: 422 }
    );
  }

  debugSteps[1] = { ...debugSteps[1], status: 'passed', detail: getGoogleMapsUrlType(finalUrl) };

  try {
    const rows = await scrapeWithHeadlessBrowser(finalUrl);
    if (rows.length > 0) {
      debugSteps[2] = { ...debugSteps[2], status: 'passed', detail: `${rows.length} place(s) found` };
      return NextResponse.json({ rows, source: 'headless', debugSteps });
    }

    debugSteps[2] = { ...debugSteps[2], status: 'failed', detail: 'The rendered page did not expose place cards.' };
    return NextResponse.json({ error: 'Page loaded but no places found. Is the list public?', debugSteps }, { status: 422 });
  } catch (err) {
    console.error('[import-url]', err);
    debugSteps[2] = { ...debugSteps[2], status: 'failed', detail: 'Headless browser could not read the page.' };
    return NextResponse.json({ error: 'Could not load the page. Is it a public list?', debugSteps }, { status: 422 });
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

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
    await sleep(2500);
    const resolvedUrl = page.url();

    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-result-index]'));
      for (const card of cards) {
        const text = card.textContent ?? '';
        if (/\d+\s*(places?|locations?|地点|個地點|个地点)/i.test(text)) {
          const btn = card.querySelector('button, a') as HTMLElement | null;
          if (btn) {
            btn.click();
            return true;
          }
          (card as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      const singlePlace = await extractSinglePlace(page);
      if (singlePlace) return [singlePlace];
    }

    if (clicked) {
      await sleep(3000);
      try {
        await page.waitForFunction(
          () => document.querySelectorAll('[role="article"], [role="listitem"]').length > 2,
          { timeout: 10_000 }
        );
      } catch {
        // The list may already be loaded.
      }
      await sleep(1000);
    }

    await page.evaluate(async () => {
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

    const scraped: { name: string; address?: string }[] = await page.evaluate(() => {
      const results: { name: string; address?: string }[] = [];
      const seen = new Set<string>();

      function isNoise(text: string) {
        if (text.length < 2 || text.length > 120) return true;
        if (/\d+\s*(places?|locations?|地点|個地點|个地点)/i.test(text)) return true;
        if (/shared list|saved places|共享列表/i.test(text)) return true;
        if (/^(google maps|saved|lists?|directions|search|layers|menu|more|route|open|close|back|photos?)$/i.test(text)) return true;
        return false;
      }

      function addResult(name: string, address?: string) {
        const key = name.toLowerCase().trim();
        if (!seen.has(key) && !isNoise(name)) {
          seen.add(key);
          results.push({ name: name.trim(), address: address?.trim() });
        }
      }

      const cards = document.querySelectorAll('[role="article"], [role="listitem"]');
      cards.forEach((card) => {
        const heading =
          card.querySelector('[role="heading"]') ??
          card.querySelector('h2, h3') ??
          card.querySelector('.fontHeadlineSmall, .qBF1Pd, .NrDZNb');
        const name = heading?.textContent?.trim();
        if (!name) return;

        const addressEl = card.querySelector('.W4Efsd, .UaQhfb, address');
        const address = addressEl?.textContent?.trim();
        addResult(name, address);
      });

      return results;
    });

    if (scraped.length === 0 && resolvedUrl !== url) {
      const fallbackPlace = parsePlaceFromUrl(resolvedUrl);
      if (fallbackPlace) return [fallbackPlace];
    }

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

async function extractSinglePlace(page: Page): Promise<ImportRow | null> {
  const place = await page.evaluate(() => {
    const href = location.href;
    const isPlacePage = /\/maps\/place\//.test(href);
    const hasPlacePanel =
      Boolean(document.querySelector('[data-item-id="address"]')) ||
      Boolean(document.querySelector('.DUwDvf, .fontHeadlineLarge'));

    if (!isPlacePage && !hasPlacePanel) return null;

    const name =
      document.querySelector('h1')?.textContent?.trim() ??
      document.querySelector('.DUwDvf, .fontHeadlineLarge, [role="main"] [role="heading"]')?.textContent?.trim() ??
      '';

    const address =
      document.querySelector('[data-item-id="address"]')?.textContent?.trim() ??
      document.querySelector('[aria-label*="Address"], [aria-label*="address"]')?.getAttribute('aria-label')?.replace(/^Address:\s*/i, '').trim() ??
      undefined;

    const atMatch = isPlacePage ? href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) : null;
    const queryMatch = href.match(/[?&](?:q|query)=([^&]+)/);

    return {
      name,
      address,
      lat: atMatch ? Number(atMatch[1]) : null,
      lng: atMatch ? Number(atMatch[2]) : null,
      query: queryMatch ? decodeURIComponent(queryMatch[1].replace(/\+/g, ' ')) : null,
    };
  });

  if (!place) return null;
  const name = (place.name || place.query || '').trim();
  if (!name || /^google maps$/i.test(name)) return null;

  return {
    name,
    address: place.address,
    lat: typeof place.lat === 'number' && !Number.isNaN(place.lat) ? place.lat : 0,
    lng: typeof place.lng === 'number' && !Number.isNaN(place.lng) ? place.lng : 0,
    list_type: 'wantto',
  };
}

function parsePlaceFromUrl(url: string): ImportRow | null {
  const parsed = new URL(url);
  const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
  const query = parsed.searchParams.get('q') ?? parsed.searchParams.get('query');
  const rawName = placeMatch?.[1] ?? query;
  if (!rawName) return null;

  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return {
    name: decodeURIComponent(rawName.replace(/\+/g, ' ')),
    lat: atMatch ? Number(atMatch[1]) : 0,
    lng: atMatch ? Number(atMatch[2]) : 0,
    list_type: 'wantto',
  };
}
