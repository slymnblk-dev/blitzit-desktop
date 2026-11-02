// Fold long columns (optional): only the first N tasks show; the rest open under "N more".
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('long columns always fold after 5, with an "N more" row', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const sp = await page.evaluate(() => { const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id);
    for (let i = 0; i < 9; i++) S.tasks.push(newTask('Task ' + i, 'today', l.id, 30));
    openSpaceSide(sp.id); return sp.id; });
  const today = page.locator('.col[data-s="today"]');
  const n = await today.locator('.row').count();
  const all = await page.evaluate(() => visible().filter(t => t.stage === 'today').length);
  expect(all).toBeGreaterThan(5);
  expect(n).toBe(5);                                                            // always on, after 5
  await expect(page.locator('[data-tg="collapseLong"]')).toHaveCount(0);        // no setting any more
  await expect(today.locator('.more-btn')).toHaveText(`${all - 5} more`);
  await today.locator('.more-btn').click();
  await expect(today.locator('.row')).toHaveCount(all);
  await expect(today.locator('.more-btn')).toHaveText('Show less');
  noErrors(errors);
});
