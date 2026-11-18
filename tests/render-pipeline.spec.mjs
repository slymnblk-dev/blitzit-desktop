// 0.323: one draw pipeline. Every redraw step is a named layer; a broken step can't stop the others.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('render runs through one named pipeline, in load order, with no patching left', async ({ page }) => {
  const errors = await openApp(page);
  const names = await page.evaluate(() => renderLayers());
  expect(names.length).toBe(27);
  expect(names[0]).toBe('inbox-page');
  expect(names.at(-1)).toBe('page-motion');
  expect(new Set(names).size).toBe(names.length);           // unique names
  expect(await page.evaluate(() => render.toString().includes('hkCall'))).toBe(true);  // nobody replaced render
  noErrors(errors);
});

test('a failing redraw step is logged but the steps after it still run', async ({ page }) => {
  await openApp(page);
  const ran = await page.evaluate(() => {
    let after = 0;
    onRender('test-broken', () => { throw new Error('boom') });
    onRender('test-after', () => { after++ });
    render();
    return after;
  });
  expect(ran).toBe(1);
});
