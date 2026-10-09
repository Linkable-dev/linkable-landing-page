// Renders the link-preview images (Open Graph / Twitter cards) from the built
// pages themselves, so a shared link shows the page as designed.
//
//   npm run build && npx vite preview --port 4173 &
//   node tools/design/og.mjs [http://localhost:4173]
//
// Writes public/assets/og/<name>.jpg at 1200x630, the size every major
// platform (Slack, LinkedIn, X, Facebook, iMessage) shows full width. Pages with
// a visual hero are shot as they look, with the header reduced to the logo; the
// rest get a title card: the page's own heading block, centred. Re-run it when a
// hero changes. Blog posts use their own hero photo and need nothing from here.
//
// Needs Playwright with Chrome, which is not a dependency of this repo (CI never
// runs this). Point PLAYWRIGHT at an installed copy if `playwright` does not resolve.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/assets/og');
const BASE = process.argv[2] || 'http://localhost:4173';
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');

export const CARDS = [
  { name: 'home', path: '/index.html', mode: 'hero' },
  { name: 'creators', path: '/creators/index.html', mode: 'hero' },
  { name: 'autopilot', path: '/autopilot/index.html', mode: 'hero' },
  { name: 'contact', path: '/contact/index.html', mode: 'hero' },
  { name: 'pricing', path: '/pricing/index.html', mode: 'title' },
  { name: 'blog', path: '/blog/index.html', mode: 'title' },
  { name: 'privacy-policy', path: '/legal/privacy-policy/index.html', mode: 'title' },
  { name: 'terms-of-service', path: '/legal/terms-of-service/index.html', mode: 'title' },
  { name: 'cookie-policy', path: '/legal/cookie-policy/index.html', mode: 'title' },
];

// 1440 wide is the layout the design was drawn at; 756 keeps the 1.91:1 ratio.
const W = 1440, H = 756;
const COMMON = `
  header .nav > :not(:first-child) { visibility: hidden !important; }
  header { position: static !important; backdrop-filter: none !important; }
  .cookie-bar, footer, .ps-progress { display: none !important; }
  #lk-root > div > section:not(#top), #lk-root > div > div:not(:has(#top)) { display: none !important; }
`;
const HERO = `#top { min-height: ${H - 68}px; }`;
// Title card: the heading block of #top (eyebrow, h1, lede), centred over the
// dashed rings of the home hero.
const TITLE = `
  #top { position: relative; overflow: hidden; min-height: ${H - 68}px; display: flex; flex-direction: column; justify-content: center; padding: 0 0 68px !important; }
  #top > .wrap ~ *, #top > .wrap:first-child > h1 ~ div, #top .lg-layout { display: none !important; }
  #top > .wrap:first-child { position: relative; z-index: 1; }
  #top h1 { font-size: 76px !important; }
  #top p { font-size: 24px !important; max-width: 780px !important; }
`;
const RINGS = [1240, 880].map((d) => `<div class="ring" style="width: ${d}px; height: ${d}px; left: 50%; top: 50%; transform: translate(-50%, -50%)"></div>`).join('');

const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
// A stored choice keeps the cookie bar away.
await ctx.addInitScript(() => localStorage.setItem('lk-consent', JSON.stringify({ version: 1, at: Date.now(), analytics: false, marketing: false })));
const page = await ctx.newPage();
fs.mkdirSync(OUT, { recursive: true });
for (const c of CARDS) {
  await page.goto(BASE + c.path, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: COMMON + (c.mode === 'hero' ? HERO : TITLE) });
  if (c.mode === 'title') await page.evaluate((rings) => document.getElementById('top').insertAdjacentHTML('afterbegin', rings), RINGS);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const png = path.join(OUT, c.name + '.png');
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: W, height: H } });
  const jpg = path.join(OUT, c.name + '.jpg');
  execFileSync('magick', [png, '-resize', '1200x630', '-strip', '-quality', '88', '-sampling-factor', '4:4:4', jpg]);
  fs.rmSync(png);
  console.log('wrote', path.relative(ROOT, jpg), Math.round(fs.statSync(jpg).size / 1024) + ' KB');
}
await browser.close();
