// Renders concept stills to public/assets/renders using headless Chromium (Playwright).
// Usage: npm run render:stills            -> all presets
//        npm run render:stills hero villa-1 -> selected presets
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/assets/renders');
mkdirSync(outDir, { recursive: true });

const bundle = await build({
  entryPoints: [join(root, 'tools/stills-entry.ts')],
  bundle: true,
  format: 'iife',
  write: false,
  target: 'es2020',
});
const html = `<!doctype html><html><body style="margin:0"><script>${bundle.outputFiles[0].text}</script></body></html>`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.setContent(html);
if (process.env.NO_AO) await page.evaluate(() => { window.noAO = true; });

const names = await page.evaluate(() => window.presetNames);
const wanted = process.argv.slice(2);
const list = wanted.length ? names.filter((n) => wanted.includes(n)) : names;

for (const name of list) {
  const wide = name === 'hero' || name.startsWith('story-') || name === 'collection-poster';
  const [w, h] = wide ? [2000, 1150] : [1600, 1067];
  const t = Date.now();
  const dataUrl = await page.evaluate(([n, ww, hh]) => window.renderPreset(n, ww, hh), [name, w, h]);
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  await sharp(png).jpeg({ quality: 80, mozjpeg: true }).toFile(join(outDir, `${name}.jpg`));
  // Smaller variant for mobile/gallery thumbnails
  await sharp(png).resize({ width: 900 }).jpeg({ quality: 76, mozjpeg: true }).toFile(join(outDir, `${name}-sm.jpg`));
  console.log(`rendered ${name} (${w}x${h}) in ${Date.now() - t} ms`);
}
await browser.close();
writeFileSync(join(outDir, 'README.txt'), 'All images in this folder are CONCEPT RENDERS generated from procedural geometry (tools/stills-entry.ts).\nReplace them with approved photography or high-quality renders using the same file names, or edit paths in src/data/properties.ts.\n');
