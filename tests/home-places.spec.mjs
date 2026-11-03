// Computer Home: spaces as tiles and lists without a space as outlined pills, one row; no "New space" pill; nothing shown when empty (0.284).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test.use({ viewport: { width: 1440, height: 900 } });

test('Home shows space tiles (with list count) and only lists without a space, and no New space pill', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.lists.push({ id: 'lgro', name: 'Groceries', c: '#F5A35A', space: '', loose: true }); save(); goHome(); });
  await expect(page.locator('#dHome .hp-sp')).toHaveCount(await page.evaluate(() => S.spaces.length));
  await expect(page.locator('#dHome .hp-ls')).toHaveCount(1);                 // only the list without a space
  await expect(page.locator('#dHome .hp-ls')).toContainText('Groceries');
  const n = await page.evaluate(() => S.lists.filter(l => l.space === S.spaces[0].id).length);
  await expect(page.locator('#dHome .hp-sp').first()).toContainText(`${n} ${n === 1 ? 'list' : 'lists'}`);
  await expect(page.locator('#dHome #spNew, #dHome .cm-sp.new, #dHome .bn-sp.new')).toHaveCount(0);
  await expect(page.locator('#dHome .hp-eye')).toHaveText(/spaces & lists/i);
  // clicks: a list opens its board, a space opens the space
  await page.locator('#dHome .hp-ls').click();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual(['all', 'lgro']);
  await page.evaluate(() => goHome());
  const sp = await page.evaluate(() => S.spaces[0].id);
  await page.locator(`#dHome .hp-sp[data-space="${sp}"]`).click();
  await expect.poll(() => page.evaluate(() => S.space || spPage)).toBe(sp);
  noErrors(errors);
});

test('no lists without a space: just the spaces, no divider; nothing at all: no label, no empty state', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goHome());
  await expect(page.locator('#dHome .hp-ls')).toHaveCount(0);
  await expect(page.locator('#dHome .hp-dv')).toHaveCount(0);
  await expect(page.locator('#dHome .hp-eye')).toHaveText(/^your spaces$/i);
  // no spaces and no lists to show (state forced for the check): the whole section disappears
  expect(await page.evaluate(() => { const keep = S.spaces; S.spaces = []; const h = hmPlaces(); S.spaces = keep; return h; })).toBe('');
  noErrors(errors);
});

test('no "New space" buttons left: sidebar and phone Home; the + still makes spaces', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => goHome());
  await expect(page.locator('#sNewSp')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => render());
  await expect(page.locator('#homeView .sp-row-new')).toBeHidden();
  await page.locator('#tbAdd:visible, #addBtn:visible').first().click();
  await expect(page.locator('#nwMenu [data-nwk="space"]')).toBeVisible();
  noErrors(errors);
});
