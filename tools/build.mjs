// Builds the single file Netlify serves (web/index.html) from the smaller source files in src/.
//   src/index.html  - the page itself (head, body markup) with two placeholders
//   src/css/*.css   - styles, joined in file-name order into the <style> tag
//   src/js/*.js     - app code, joined in file-name order into one <script> tag
// The parts share one scope (like before), so order matters: keep the number prefixes.
// Run: npm run build:web   (the automatic checks fail if web/index.html is out of date)
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'src');

async function joinFolder(folder, ext) {
  const files = (await readdir(join(src, folder))).filter(f => f.endsWith(ext)).sort();
  const parts = await Promise.all(files.map(f => readFile(join(src, folder, f), 'utf8')));
  return parts.join('');
}

const page = await readFile(join(src, 'index.html'), 'utf8');
const css = await joinFolder('css', '.css');
const js = await joinFolder('js', '.js');
for (const mark of ['/*@CSS*/', '/*@JS*/']) {
  if (page.split(mark).length !== 2) throw new Error(`src/index.html must contain ${mark} exactly once`);
}
const out = page.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => js);
await writeFile(join(root, 'web', 'index.html'), out);
console.log(`web/index.html built (${(out.length / 1024).toFixed(0)} KB)`);
