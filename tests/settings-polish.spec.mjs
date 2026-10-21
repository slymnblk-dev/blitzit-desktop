// Settings home in two groups with icons; Data page shows full values and a danger zone;
// search filters only where there is a board; a blank new space shows a soft + and "Auto".
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('settings groups, data danger zone, search filters only on a board, blank new space', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => openSettings());
  await expect(page.locator('#setIn .cat-cap')).toHaveText(['App', 'Organise']);
  await expect(page.locator('#setIn .cat-ic')).toHaveCount(0);
  await page.locator('#setIn [data-page="data"]').click();
  await expect(page.locator('#setIn .bk-last').first()).toHaveText('Never');
  const w = await page.locator('#setIn .bk-last').first().evaluate(e => e.scrollWidth <= e.clientWidth + 1);
  expect(w).toBe(true);
  await expect(page.locator('#setIn .dz-sec #resetAll')).toBeVisible();
  await page.locator('#setIn #resetAll').click();
  await expect(page.locator('#dzBox')).toBeVisible();
  await page.evaluate(() => closeSettings());

  await page.evaluate(() => { goHome(); openSearch(); });
  await expect(page.locator('#srch .sf-card')).toHaveCount(0);
  await page.evaluate(() => { closeSearch(); openSpace(S.spaces[0].id); openSearch(); });
  await expect(page.locator('#srch .sf-card')).toHaveCount(1);
  await page.evaluate(() => { closeSearch(); openSpaceSheet(null); });
  await expect(page.locator('#spPrev')).toHaveText('+');
  await expect(page.locator('#spOpts [data-lxt="i"] .lx-v')).toHaveText('Auto');
  await page.locator('#spName').fill('Music');
  await expect(page.locator('#spPrev')).not.toHaveText('+');
  noErrors(errors);
});
