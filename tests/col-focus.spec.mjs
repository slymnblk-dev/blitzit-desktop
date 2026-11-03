// Computer board, one column expanded: the folded side columns show just how many tasks they hold (0.296).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('columns show just their count (0.297), expanded or not', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { const sp = S.spaces[0]; openSpaceSide(sp.id); S.list = S.lists.find(l => l.space === sp.id).id; render(); });
  const n = st => page.evaluate(s => S.tasks.filter(t => shown(t) && t.list === S.list && t.stage === s).length, st);
  await expect(page.locator('.col[data-s="backlog"] .col-n')).toHaveText(String(await n('backlog')));
  await page.evaluate(() => { S.colFocus = 'today'; applyColFocus(false); render(); });
  await expect(page.locator('.col[data-s="backlog"] .col-n')).toHaveText(String(await n('backlog')));
  await expect(page.locator('.col[data-s="week"] .col-n')).toHaveText(String(await n('week')));
  await expect(page.locator('.col[data-s="today"] .col-n')).toHaveText(String(await n('today')));
  await page.evaluate(() => { S.colFocus = null; applyColFocus(false); render(); });
  await expect(page.locator('.col[data-s="backlog"] .col-n')).toHaveText(String(await n('backlog')));
  noErrors(errors);
});
