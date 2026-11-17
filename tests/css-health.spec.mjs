// 0.325: CSS stays well-formed. A stray "}" makes browsers silently drop the next rule (found and fixed in tasks/spaces-home-detail.css).
import { test, expect } from '@playwright/test';
import fs from 'fs';

const cssFiles = () => fs.readdirSync('src/css', { recursive: true }).filter(f => f.endsWith('.css'));
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');

test('every CSS file has balanced braces (no orphan lines)', () => {
  for (const f of cssFiles()) {
    const s = strip(fs.readFileSync('src/css/' + f, 'utf8'));
    let d = 0, line = 1;
    for (const c of s) { if (c === '\n') line++; if (c === '{') d++; if (c === '}') { d--; expect(d, `${f}: extra "}" near line ${line}`).toBeGreaterThanOrEqual(0); } }
    expect(d, `${f}: unclosed "{"`).toBe(0);
  }
});

test('no declarations floating outside a rule', () => {
  for (const f of cssFiles()) {
    const s = strip(fs.readFileSync('src/css/' + f, 'utf8'));
    let d = 0, buf = '';
    for (const c of s) {
      if (c === '{') { expect(buf.includes(';') && !buf.trim().startsWith('@'), `${f}: stray "${buf.trim().slice(0, 60)}"`).toBe(false); d++; buf = ''; }
      else if (c === '}') { d--; buf = ''; }
      else if (d === 0) buf += c;
    }
  }
});

test('ORDER.txt lists every source file exactly once (the build relies on it)', () => {
  for (const [dir, ext] of [['src/js', '.js'], ['src/css', '.css']]) {
    const order = fs.readFileSync(dir + '/ORDER.txt', 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const disk = fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith(ext)).map(f => f.split('\\').join('/'));
    expect(new Set(order).size, dir + ' duplicates').toBe(order.length);
    expect([...order].sort(), dir).toEqual([...disk].sort());
  }
});
