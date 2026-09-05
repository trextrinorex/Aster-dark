import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
const seen = new Set();
const duplicates = ids.filter(id => seen.has(id) || !seen.add(id));
if (duplicates.length) throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);

for (const ref of ['styles.css', 'app.js']) {
  if (!html.includes(ref)) throw new Error(`Missing asset reference: ${ref}`);
}
for (const id of ['space','yearSlider','regionList','cityList','pollutionSlider','citySlider','restoreBtn','enterBtn','menuBtn','soundToggle','progressBar']) {
  if (!ids.includes(id)) throw new Error(`Missing required element id: ${id}`);
}

const scenes = [...html.matchAll(/<section\b[^>]*class=["'][^"']*\bscene\b[^"']*["'][^>]*data-scene=["'](\d+)["']/g)].map(m => Number(m[1]));
if (scenes.length < 8) throw new Error(`Expected at least 8 scenes, found ${scenes.length}`);
if (Math.max(...scenes) > 8) throw new Error('Scene number exceeds /08 navigation contract');

const referencedIds = new Set([...js.matchAll(/querySelector\(['"]#([^'"]+)['"]\)/g)].map(m => m[1]));
const missing = [...referencedIds].filter(id => !ids.includes(id));
if (missing.length) throw new Error(`JS references missing HTML ids: ${missing.join(', ')}`);

if (!js.includes('prefers-reduced-motion')) throw new Error('Reduced-motion handling is missing');
if (!js.includes('canvas')) throw new Error('Canvas bootstrap missing');
if (!css.includes('@media')) throw new Error('Responsive CSS appears to be missing');

console.log(`Smoke validation passed: ${ids.length} unique ids, ${scenes.length} scenes.`);
