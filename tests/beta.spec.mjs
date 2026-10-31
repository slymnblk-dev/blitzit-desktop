// Beta: KPIs & OKRs, Wins, Routines, Plan and Journal sit in a folded Beta group in Settings → Modes; their pages say Beta.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('Beta group starts folded, opens, keeps open while toggling; beta pages show a badge', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .md-card[data-md="habits"]')).toBeVisible();
  for (const k of ['mx', 'wins', 'routines', 'plan', 'journal']) await expect(page.locator(`#setIn .bt-body .md-card[data-md="${k}"]`)).toBeHidden();
  await page.locator('#setIn [data-btgrp]').click();
  await expect(page.locator('#setIn .bt-body .md-card')).toHaveCount(5);
  await page.locator('#setIn .md-card[data-md="wins"] [data-tg="wins"]').click();
  await expect.poll(() => page.evaluate(() => S.cfg.wins)).toBe(true);
  await expect(page.locator('#setIn .md-card[data-md="wins"]')).toBeVisible();
  await expect(page.locator('#setIn .bt-head small')).toContainText('1 on');
  // folded again next time Settings opens
  await page.evaluate(() => { closeSettings(); openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .md-card[data-md="wins"]')).toBeHidden();
  // the page title wears the badge
  await page.evaluate(() => { closeSettings(); openWins(); });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#winsPg h1.ib-h'), '::after').content)).toBe('"Beta"');
  noErrors(errors);
});
