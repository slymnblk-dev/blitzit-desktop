// The Lists sheet header uses one ⋯ menu (Edit lists / Edit space); there are 10 list colours.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('lists sheet: ⋯ menu opens edit mode, Done closes it; 10 colours', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => PALETTE.length)).toBe(10);
  await page.evaluate(() => { editing = false; nl = null; drawLists(); openSheet('listSheet'); });
  await expect(page.locator('#editLists')).toBeHidden();
  await page.locator('#listsMore').click();
  await expect(page.locator('#listsPop')).toBeVisible();
  await page.locator('#lmEdit').click();
  expect(await page.evaluate(() => editing)).toBe(true);
  await expect(page.locator('#listsMore')).toBeHidden();
  await expect(page.locator('#editLists')).toHaveText('Done');
  await page.locator('#editLists').click();
  expect(await page.evaluate(() => editing)).toBe(false);
  await expect(page.locator('#listsMore')).toBeVisible();
  await page.locator('#listsMore').click();
  await page.locator('#listTitle, #listsTitle').first().click();
  await expect(page.locator('#listsPop')).toBeHidden();
  noErrors(errors);
});
