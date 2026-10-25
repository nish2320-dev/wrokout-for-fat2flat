/* -------------------------------------------------------------
   Renders the Fat2Flat app icon set into mobile/assets/images/
   from the brand emblem (run redraw-logo.py first if the logo changes).
   Shares the Chromium pipeline used for the App Store screenshots
   so the icon and the marketing artwork stay on one brand.
   Usage: node make-icons.mjs
   ------------------------------------------------------------- */
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..', 'mobile', 'assets', 'images');

// The Fat2Flat emblem, redrawn sharp from the original logo by redraw-logo.py.
// Inlined as a data URL: a page made with setContent can't load file:// images.
const EMBLEM = `data:image/png;base64,${readFileSync(path.join(here, 'assets', 'fat2flat-emblem.png')).toString('base64')}`;

/**
 * One icon: the emblem centred on `bg`, `inset`% of the canvas wide.
 * `mono` paints it a single colour, as Android's themed icons require.
 */
const page = ({ size, bg, inset, mono }) => `
  <!doctype html><meta charset="utf-8">
  <style>
    html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}
    body{background:${bg};display:grid;place-items:center}
    img{width:${inset}%;height:auto;display:block${mono ? ';filter:brightness(0) invert(1)' : ''}}
  </style>
  <img src="${EMBLEM}">`;

const ICONS = [
  // iOS + generic app icon: full bleed white, no transparency (Apple rejects alpha)
  { file: 'icon.png', size: 1024, bg: '#fff', inset: 86 },
  { file: 'favicon.png', size: 96, bg: '#fff', inset: 92 },
  // splash sits on white (app.json), so it only needs the emblem itself
  { file: 'splash-icon.png', size: 1024, bg: 'transparent', inset: 96 },
  // Android adaptive layers: foreground must stay inside the 66% safe zone
  { file: 'android-icon-background.png', size: 1024, bg: '#fff', inset: 0 },
  { file: 'android-icon-foreground.png', size: 1024, bg: 'transparent', inset: 62 },
  { file: 'android-icon-monochrome.png', size: 1024, bg: 'transparent', inset: 62, mono: true },
];

const executablePath = process.env.CHROMIUM_PATH
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({ executablePath, args: ['--force-color-profile=srgb'] });

for (const icon of ICONS) {
  const p = await browser.newPage({
    viewport: { width: icon.size, height: icon.size },
    deviceScaleFactor: 1,
  });
  await p.setContent(page(icon), { waitUntil: 'load' });
  await p.screenshot({
    path: path.join(out, icon.file),
    omitBackground: icon.bg === 'transparent',
  });
  await p.close();
  console.log(`  ${icon.file} (${icon.size}px)`);
}

await browser.close();
console.log('\nicons written to mobile/assets/images/');
