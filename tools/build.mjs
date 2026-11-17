// Builds the single file Netlify serves (web/index.html) from the smaller source files in src/.
//   src/index.html  - the page itself (head, body markup) with two placeholders
//   src/css/**.css  - styles, joined in the order of src/css/ORDER.txt into the <style> tag
//   src/js/**.js    - app code, joined in the order of src/js/ORDER.txt into one <script> tag
// Files live in folders by area (core, tasks, home, modes, ...). The parts share one scope, so order matters:
// it lives in ORDER.txt, not in file names. The build stops if ORDER.txt and the folder disagree.
// The joined CSS and JS are minified with esbuild (smaller download, faster open). Top-level names
// stay as they are (it is one plain script), so the parts can still replace each other's functions.
// Read and edit src/ - never the built file. BUILD_PLAIN=1 skips minifying (for debugging).
// Run: npm run build:web   (the automatic checks fail if web/index.html is out of date)
import { transform } from 'esbuild';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'src');

async function joinFolder(folder, ext) {
  const dir = join(src, folder);
  const files = (await readFile(join(dir, 'ORDER.txt'), 'utf8')).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const onDisk = (await readdir(dir, { recursive: true })).filter(f => f.endsWith(ext)).map(f => f.split('\\').join('/'));
  const missing = onDisk.filter(f => !files.includes(f)), gone = files.filter(f => !onDisk.includes(f));
  if (missing.length || gone.length || new Set(files).size !== files.length)
    throw new Error(`src/${folder}/ORDER.txt is out of step. Not listed: ${missing.join(', ') || '-'} · listed but missing: ${gone.join(', ') || '-'}`);
  const parts = await Promise.all(files.map(f => readFile(join(src, folder, f), 'utf8')));
  return parts.join('');
}

const page = await readFile(join(src, 'index.html'), 'utf8');
const plain = process.env.BUILD_PLAIN === '1';
const mini = async (code, loader) => plain ? code
  : (await transform(code, { loader, minify: true, legalComments: 'none', charset: 'utf8' })).code.trim();
const css = await mini(await joinFolder('css', '.css'), 'css');
const js = await mini(await joinFolder('js', '.js'), 'js');
for (const mark of ['/*@CSS*/', '/*@JS*/']) {
  if (page.split(mark).length !== 2) throw new Error(`src/index.html must contain ${mark} exactly once`);
}
const out = page.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => js);
await writeFile(join(root, 'web', 'index.html'), out);
console.log(`web/index.html built (${(out.length / 1024).toFixed(0)} KB)`);
