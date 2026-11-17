// 0.324: shared functions are extended through named layers, never patched by reassignment.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const LAYERED = { render: 26, renderDesk: 9, applySettings: 10, setStage: 3, tbGo: 9, tabNow: 6, tabsList: 7, rhythmSide: 8, modesPage: 7 };

test('every layered function runs through its named layers, nobody replaced it', async ({ page }) => {
  const errors = await openApp(page);
  const got = await page.evaluate(names => Object.fromEntries(names.map(n => [n, {
    layers: hkLayers(n), dispatches: window[n].toString().includes('hkCall')
  }])), Object.keys(LAYERED));
  for (const [n, count] of Object.entries(LAYERED)) {
    expect(got[n].dispatches, n).toBe(true);
    expect(got[n].layers.length, n).toBe(count);
    expect(new Set(got[n].layers).size, n + ' names unique').toBe(count);
  }
  noErrors(errors);
});

test('tabs, stages, settings and modes still work through their layers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { Object.assign(S.cfg, { habits: true, goals: true, vision: true, journal: true }); save(); applySettings(); render(); });
  const tabs = await page.evaluate(() => tabsList().map(t => t[0]));
  expect(tabs).toContain('home');
  for (const k of tabs) { await page.evaluate(k => tbGo(k), k); expect(await page.evaluate(() => tabNow())).toBe(k); }
  expect(await page.evaluate(() => typeof modesPage() === 'string' && modesPage().length > 100)).toBe(true);
  expect(await page.evaluate(() => typeof rhythmSide())).toBe('string');
  noErrors(errors);
});
