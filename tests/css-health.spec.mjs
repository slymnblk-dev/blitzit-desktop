// 0.325: CSS stays well-formed. A stray "}" makes browsers silently drop the next rule (found and fixed in 04-spaces-home-detail.css).
import { test, expect } from '@playwright/test';
import fs from 'fs';

const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');

test('every CSS file has balanced braces (no orphan lines)', () => {
  for (const f of fs.readdirSync('src/css')) {
    const s = strip(fs.readFileSync('src/css/' + f, 'utf8'));
    let d = 0, line = 1;
    for (const c of s) { if (c === '\n') line++; if (c === '{') d++; if (c === '}') { d--; expect(d, `${f}: extra "}" near line ${line}`).toBeGreaterThanOrEqual(0); } }
    expect(d, `${f}: unclosed "{"`).toBe(0);
  }
});

test('no declarations floating outside a rule', () => {
  for (const f of fs.readdirSync('src/css')) {
    const s = strip(fs.readFileSync('src/css/' + f, 'utf8'));
    let d = 0, buf = '';
    for (const c of s) {
      if (c === '{') { expect(buf.includes(';') && !buf.trim().startsWith('@'), `${f}: stray "${buf.trim().slice(0, 60)}"`).toBe(false); d++; buf = ''; }
      else if (c === '}') { d--; buf = ''; }
      else if (d === 0) buf += c;
    }
  }
});
