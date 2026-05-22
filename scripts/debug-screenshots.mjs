#!/usr/bin/env node
/**
 * Debug Screenshot Tool
 *
 * Captures periodic or manual screenshots of the running app for UI review.
 * Screenshots are saved to debug/screenshots/ with sequential numbering.
 *
 * Usage:
 *   node scripts/debug-screenshots.mjs                  # auto, 1s interval
 *   node scripts/debug-screenshots.mjs --interval 3000  # auto, 3s interval
 *   node scripts/debug-screenshots.mjs --manual         # press Enter to capture
 *   node scripts/debug-screenshots.mjs --url http://localhost:3001
 *   node scripts/debug-screenshots.mjs --manual --url http://localhost:3001
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Parse args ---
const args = process.argv.slice(2);
const isManual = args.includes('--manual');
const intervalArg = args.indexOf('--interval');
const urlArg = args.indexOf('--url');

const INTERVAL_MS = intervalArg !== -1 ? parseInt(args[intervalArg + 1], 10) : 1000;
const APP_URL = urlArg !== -1 ? args[urlArg + 1] : 'http://localhost:3000';

// --- Output directory ---
const OUT_DIR = path.join(ROOT, 'debug', 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Find the next sequential index
function nextIndex() {
  const existing = fs.readdirSync(OUT_DIR)
    .map(f => parseInt(f, 10))
    .filter(n => !isNaN(n));
  return existing.length > 0 ? Math.max(...existing) + 1 : 0;
}

async function main() {
  console.log(`\nDebug Screenshot Tool`);
  console.log(`  URL:  ${APP_URL}`);
  console.log(`  Mode: ${isManual ? 'manual (press Enter to capture, q+Enter to quit)' : `auto every ${INTERVAL_MS}ms`}`);
  console.log(`  Out:  ${OUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: false,           // show the browser so you can interact with the app
    defaultViewport: null,     // use the window's actual size
    args: ['--start-maximized'],
  });

  const [page] = await browser.pages();
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  console.log('App loaded. Starting capture...\n');

  async function capture() {
    const idx = nextIndex();
    const file = path.join(OUT_DIR, `${idx}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  [${new Date().toLocaleTimeString()}] Saved screenshot ${idx}.png`);
  }

  if (isManual) {
    const rl = readline.createInterface({ input: process.stdin });
    console.log('Press Enter to capture. Type q + Enter to quit.\n');
    rl.on('line', async (input) => {
      if (input.trim().toLowerCase() === 'q') {
        console.log('\nQuitting...');
        rl.close();
        await browser.close();
        process.exit(0);
      }
      await capture();
    });
    rl.on('close', async () => {
      await browser.close();
    });
  } else {
    // Auto mode — capture on interval, Ctrl+C to stop
    process.on('SIGINT', async () => {
      console.log('\nStopping capture...');
      await browser.close();
      process.exit(0);
    });
    const timer = setInterval(capture, INTERVAL_MS);
    browser.on('disconnected', () => {
      clearInterval(timer);
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
