// Full width (computers): the sidebar hides inside a space; the top bar goes home and switches spaces and lists.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('full width: hide sidebar in a space, switch space and list, go home', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('[data-fw="1"]').click();
  expect(await page.evaluate(() => S.cfg.fullWidth)).toBe(true);
  await page.evaluate(() => closeSettings());
  await expect(page.locator('#desk')).not.toHaveClass(/\bfw\b/);              // Home keeps the sidebar
  const [a, b] = await page.evaluate(() => S.spaces.slice(0, 2).map(s => s.id));
  await page.evaluate(id => openSpaceSide(id), a);
  await expect(page.locator('#desk')).toHaveClass(/\bfw\b/);
  await expect(page.locator('.side')).toHaveCSS('opacity', '0');
  await page.locator('[data-fwp]').click();                                   // one menu: switch space
  await page.locator(`.fw-h[data-fwsp="${b}"]`).click();
  expect(await page.evaluate(() => S.space)).toBe(b);
  const lid = await page.evaluate(a => { S.lists.push({ id: 'lfw', name: 'Second', c: '#888', space: a }); render(); return 'lfw'; }, a);
  await page.locator('[data-fwp]').click();                                   // …and a list in another space
  await page.locator(`[data-fwl="${lid}"]`).click();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual([a, lid]);
  await page.locator('#fwBack').click();                                      // back home
  expect(await page.evaluate(() => S.space)).toBe(null);
  await expect(page.locator('#desk')).not.toHaveClass(/\bfw\b/);
  noErrors(errors);
});
