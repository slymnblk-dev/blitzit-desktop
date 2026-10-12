// Fold long columns (optional): only the first N tasks show; the rest open under "N more".
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('fold long columns: off by default; on shows first N and an "N more" row', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const sp = await page.evaluate(() => { const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id);
    for (let i = 0; i < 9; i++) S.tasks.push(newTask('Task ' + i, 'today', l.id, 30));
    openSpaceSide(sp.id); return sp.id; });
  const today = page.locator('.col[data-s="today"]');
  const n = await today.locator('.row').count();
  expect(n).toBeGreaterThan(5);
  await expect(today.locator('.more-btn')).toHaveCount(0);                      // off by default
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await page.locator('[data-tg="collapseLong"]').click();
  await page.locator('[data-k="collapseAt"][data-v="3"]').click();
  await page.evaluate(() => closeSettings());
  await expect(today.locator('.row')).toHaveCount(3);
  await expect(today.locator('.more-btn')).toHaveText(`${n - 3} more`);
  await today.locator('.more-btn').click();
  await expect(today.locator('.row')).toHaveCount(n);
  await expect(today.locator('.more-btn')).toHaveText('Show less');
  noErrors(errors);
});
