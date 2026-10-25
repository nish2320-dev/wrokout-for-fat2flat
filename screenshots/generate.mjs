/* -------------------------------------------------------------
   Renders the App Store screenshot set at every required size.
   Usage: node generate.mjs [--sizes 6.9,6.5] [--logo assets/logo.png]
          node generate.mjs --real <dir of captures> [--sizes 6.9]
   ------------------------------------------------------------- */
import { chromium } from 'playwright';
import { mkdir, rm, access, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// App Store Connect accepted iPhone screenshot dimensions (portrait).
const SIZES = [
  { key: '6.9', label: 'iphone-6.9-1320x2868', w: 1320, h: 2868 }, // iPhone 16/17 Pro Max — required
  { key: '6.5', label: 'iphone-6.5-1242x2688', w: 1242, h: 2688 }, // iPhone 11 Pro Max / XS Max
  { key: '6.7', label: 'iphone-6.7-1290x2796', w: 1290, h: 2796 }  // iPhone 14/15 Pro Max
];

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const only = arg('sizes', '').split(',').map(s => s.trim()).filter(Boolean);
const sizes = only.length ? SIZES.filter(s => only.includes(s.key)) : SIZES;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const page_url = pathToFileURL(path.join(root, 'src', 'index.html')).href;

const logoPath = arg('logo', 'assets/logo.png');
let logoSrc = null;
try {
  await access(path.resolve(root, logoPath));
  logoSrc = pathToFileURL(path.resolve(root, logoPath)).href;
  console.log(`using logo: ${logoPath}`);
} catch {
  console.log('no assets/logo.png found — using the built-in wordmark lockup');
}

// --real <dir>: frame captures of the running app instead of the mock screens
const realDir = arg('real', '');
let realSrcs = null;
if (realDir) {
  const files = (await readdir(path.resolve(realDir)))
    .filter(f => /\.(png|jpe?g)$/i.test(f))
    .sort();
  // NN-<id>.png: the id picks the caption, NN the order
  realSrcs = files.map(f => ({
    id: f.replace(/^\d+-/, '').replace(/\.[^.]+$/, '').toLowerCase(),
    src: pathToFileURL(path.resolve(realDir, f)).href
  }));
  console.log(`framing ${files.length} captures from ${realDir}: ${files.join(', ')}`);
}
const outName = realSrcs ? 'out-real' : 'out';

await rm(path.join(root, outName), { recursive: true, force: true });

// Honour a pre-installed Chromium when the environment ships one.
const executablePath = process.env.CHROMIUM_PATH
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({
  executablePath,
  args: ['--force-color-profile=srgb', '--font-render-hinting=none']
});

for (const size of sizes) {
  const dir = path.join(root, outName, size.label);
  await mkdir(dir, { recursive: true });

  const page = await browser.newPage({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1
  });
  await page.goto(page_url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  if (realSrcs) {
    const known = await page.evaluate(() => window.__realIds);
    const unknown = realSrcs.filter(r => !known.includes(r.id)).map(r => r.id);
    if (unknown.length) throw new Error(`no caption for: ${unknown.join(', ')} (known: ${known.join(', ')})`);
  }
  const count = realSrcs ? realSrcs.length : await page.evaluate(() => window.__slideCount);
  for (let i = 0; i < count; i++) {
    const id = await page.evaluate(
      ([i, w, h, logo, real]) => window.__draw(i, w, h, logo, real),
      [i, size.w, size.h, logoSrc, realSrcs ? realSrcs[i] : null]
    );
    await page.evaluate(() => document.fonts.ready);
    if (realSrcs) await page.waitForFunction(() => [...document.images].every(im => im.complete));
    const fill = await page.evaluate(() => {
      const b = document.querySelector('.body');
      if (!b) return { over: 0, h: 0 }; // real captures fill the screen exactly
      return { over: b.scrollHeight - b.clientHeight, h: b.clientHeight };
    });
    const file = path.join(dir, `${String(i + 1).padStart(2, '0')}-${id}.png`);
    await page.screenshot({ path: file, type: 'png' });
    const note = fill.over > 0 ? `clipped ${fill.over}px` : `${-fill.over}px of slack`;
    console.log(`  ${size.label}/${path.basename(file)}  (${note})`);
  }
  await page.close();
}

await browser.close();
console.log('\ndone.');
