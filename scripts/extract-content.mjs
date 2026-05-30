/**
 * Estrae immagini base64 dai vecchi HTML ReadyMag e le salva come file.
 * Esegui con: node scripts/extract-content.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLD = 'E:\\Repos\\Morfeo';
const NEW = path.resolve(__dirname, '..');

function extractFromHtml(html, outputDir, prefix) {
  fs.mkdirSync(outputDir, { recursive: true });
  const saved = [];
  const seen = new Set();

  // src="data:image/..."
  const srcRe = /src="data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/=]+)"/gi;
  // url("data:image/...") or url(data:image/...)
  const bgRe = /url\(["']?data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/=]+)["']?\)/gi;

  let idx = 1;
  for (const re of [srcRe, bgRe]) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const b64 = m[2];
      if (seen.has(b64.slice(0, 40))) continue; // dedup
      seen.add(b64.slice(0, 40));

      const buf = Buffer.from(b64, 'base64');
      if (buf.length < 30_000) continue; // salta icone/elementi UI

      const filename = `${prefix}-${String(idx).padStart(2, '0')}.${ext}`;
      fs.writeFileSync(path.join(outputDir, filename), buf);
      const webPath = `/images/${path.relative(path.join(NEW, 'public', 'images'), outputDir).replace(/\\/g, '/')}/${filename}`;
      saved.push({ file: filename, web: webPath, kb: Math.round(buf.length / 1024) });
      console.log(`  [${prefix}] ${filename}  ${Math.round(buf.length / 1024)}KB`);
      idx++;
    }
  }
  return saved;
}

const manifest = {};

// Work pages 01-04
for (let i = 1; i <= 4; i++) {
  const id = `0${i}`;
  console.log(`\n▶ work/${id}`);
  const html = fs.readFileSync(path.join(OLD, 'work', id, 'index.html'), 'utf8');
  console.log(`  file: ${(html.length / 1_048_576).toFixed(1)}MB`);
  const out = path.join(NEW, 'public', 'images', 'work', id);
  manifest[id] = extractFromHtml(html, out, id);
  console.log(`  → ${manifest[id].length} immagini salvate`);
}

// Work index (thumbnail covers)
console.log('\n▶ work/index');
try {
  const html = fs.readFileSync(path.join(OLD, 'work', 'index.html'), 'utf8');
  const out = path.join(NEW, 'public', 'images', 'work', 'covers');
  manifest['covers'] = extractFromHtml(html, out, 'cover');
  console.log(`  → ${manifest['covers'].length} cover`);
} catch {}

// About page
console.log('\n▶ about');
try {
  const html = fs.readFileSync(path.join(OLD, 'about', 'index.html'), 'utf8');
  const out = path.join(NEW, 'public', 'images', 'about');
  manifest['about'] = extractFromHtml(html, out, 'about');
  console.log(`  → ${manifest['about'].length} immagini`);
} catch {}

// Archive
console.log('\n▶ archive');
try {
  const html = fs.readFileSync(path.join(OLD, 'archive', 'index.html'), 'utf8');
  const out = path.join(NEW, 'public', 'images', 'archive');
  manifest['archive'] = extractFromHtml(html, out, 'arch');
  console.log(`  → ${manifest['archive'].length} immagini`);
} catch {}

// Salva manifest
const manifestPath = path.join(__dirname, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n✓ manifest salvato in scripts/manifest.json`);
console.log('\n=== RIEPILOGO ===');
for (const [k, v] of Object.entries(manifest)) {
  console.log(`  ${k}: ${v.length} immagini`);
}
