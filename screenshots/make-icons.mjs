/* -------------------------------------------------------------
   Renders the Fat2Flat app icon set into mobile/assets/images/.
   Shares the Chromium pipeline used for the App Store screenshots
   so the icon and the marketing artwork stay on one brand.
   Usage: node make-icons.mjs
   ------------------------------------------------------------- */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..', 'mobile', 'assets', 'images');

const RED_1 = '#FF4033';
const RED_2 = '#B31A12';

/** The dumbbell mark, drawn to fill a 24x24 box. */
const mark = (color, stroke = 2.4) => `
  <svg viewBox="0 0 24 24" fill="none" stroke="${color}"
       stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 7v10M3.4 9.4v5.2M17.5 7v10M20.6 9.4v5.2M6.5 12h11"/>
  </svg>`;

const page = ({ size, bg, color, inset, stroke }) => `
  <!doctype html><meta charset="utf-8">
  <style>
    html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}
    body{background:${bg};display:grid;place-items:center}
    .m{width:${inset}%;height:${inset}%}
    svg{width:100%;height:100%;display:block}
  </style>
  <div class="m">${mark(color, stroke)}</div>`;

const ICONS = [
  // iOS + generic app icon: full bleed, no transparency (Apple rejects alpha)
  { file: 'icon.png', size: 1024, bg: `linear-gradient(150deg, ${RED_1}, ${RED_2})`, color: '#fff', inset: 54, stroke: 2.1 },
  { file: 'favicon.png', size: 96, bg: `linear-gradient(150deg, ${RED_1}, ${RED_2})`, color: '#fff', inset: 58, stroke: 2.4 },
  // splash sits on white, so the mark carries the colour
  { file: 'splash-icon.png', size: 512, bg: 'transparent', color: RED_2, inset: 70, stroke: 2.2 },
  // Android adaptive layers: foreground must stay inside the 66% safe zone
  { file: 'android-icon-background.png', size: 1024, bg: RED_2, color: 'transparent', inset: 1, stroke: 0 },
  { file: 'android-icon-foreground.png', size: 1024, bg: 'transparent', color: '#fff', inset: 40, stroke: 2.1 },
  { file: 'android-icon-monochrome.png', size: 1024, bg: 'transparent', color: '#fff', inset: 40, stroke: 2.1 },
];

const executablePath = process.env.CHROMIUM_PATH
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({ executablePath, args: ['--force-color-profile=srgb'] });

for (const icon of ICONS) {
  const p = await browser.newPage({
    viewport: { width: icon.size, height: icon.size },
    deviceScaleFactor: 1,
  });
  await p.setContent(page(icon));
  await p.screenshot({
    path: path.join(out, icon.file),
    omitBackground: icon.bg === 'transparent',
  });
  await p.close();
  console.log(`  ${icon.file} (${icon.size}px)`);
}

await browser.close();
console.log('\nicons written to mobile/assets/images/');
