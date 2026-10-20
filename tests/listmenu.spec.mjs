// Full width is the default; list cards on a space's page have a ⋯ menu.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('full width by default, and the list ⋯ menu renames, recolours, moves and deletes (with confirmation)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  const sp = await page.evaluate(() => { const sp = S.spaces[0];
    ['Marketing', 'Sales'].forEach((n, i) => S.lists.push({ id: 'lm' + i, name: n, c: PALETTE[i], space: sp.id })); save(); render(); return { id: sp.id, fw: S.cfg.fullWidth, other: S.spaces[1].id }; });
  expect(sp.fw).toBe(true);
  await page.locator(`#dHome [data-space="${sp.id}"]`).click();
  await page.locator('.lp-card[data-lp="lm0"]').hover();
  await page.locator('[data-lpm="lm0"]').click();
  await expect(page.locator('[data-lpop="lm0"]')).toBeVisible();
  await page.locator('[data-lpren="lm0"]').click();
  await page.keyboard.press('Control+a'); await page.keyboard.type('Brand'); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.lists.find(l => l.id === 'lm0').name)).toBe('Brand');
  await page.locator('[data-lpm="lm0"]').click();
  await page.locator(`[data-lpop="lm0"] [data-lpc="${await page.evaluate(() => PALETTE[5])}"]`).click();
  expect(await page.evaluate(() => S.lists.find(l => l.id === 'lm0').c)).toBe(await page.evaluate(() => PALETTE[5]));
  await page.locator('[data-lpm="lm0"]').click();
  await page.locator(`[data-lpop="lm0"] [data-lpmv="${sp.other}"]`).click();
  expect(await page.evaluate(() => S.lists.find(l => l.id === 'lm0').space)).toBe(sp.other);
  await page.locator('.lp-card[data-lp="lm1"]').hover();
  await page.locator('[data-lpm="lm1"]').click();
  await page.locator('[data-lpdel="lm1"]').click();
  await expect(page.locator('#dlg')).toHaveClass(/on/);                       // asks first: type the list's name
  await page.locator('#dlgIn').fill('Sales');
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(() => S.lists.some(l => l.id === 'lm1'))).toBe(false);
  noErrors(errors);
});
