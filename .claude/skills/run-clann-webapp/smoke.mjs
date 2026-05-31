#!/usr/bin/env node
/**
 * Smoke driver for clann-webapp.
 *
 * Prerequisites:
 *   npx playwright install chromium   (one-time; installs the browser)
 *
 * Usage:
 *   node smoke.mjs                    # unauthenticated pages only
 *   TEST_EMAIL=x@x.com TEST_PASSWORD=pw node smoke.mjs   # full login flow
 *
 * Screenshots land in /tmp/shots/.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const SHOTS = '/tmp/shots';
const BASE = 'http://localhost:3001/en';
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`  screenshot → ${SHOTS}/${name}.png`);
}

// 1. Landing page
console.log('→ landing page');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await shot('landing');
console.log('  title:', await page.title());

// 2. Login page
console.log('→ login page');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
await shot('login');

// 3. Authenticated flow (optional)
const { TEST_EMAIL: email, TEST_PASSWORD: pw } = process.env;
if (email && pw) {
  console.log('→ logging in as', email);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await shot('post-login');
  console.log('  landed at:', page.url());

  // Family list page
  console.log('→ /family');
  await page.goto(`${BASE.replace('/en', '')}/en/family`, { waitUntil: 'networkidle', timeout: 20000 });
  await shot('family');

  const errs = await page.evaluate(() =>
    window.__playwright_errors ?? []
  );
  if (errs.length) console.warn('console errors:', errs);
}

await browser.close();
console.log(`\nAll screenshots in ${SHOTS}/`);
