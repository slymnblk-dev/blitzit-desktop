// Computer sidebar: Lists, Modes and Spaces fold from their label and stay folded after a reload (0.286).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test.use({ viewport: { width: 1440, height: 900 } });

test('each sidebar section folds and unfolds, remembers it, and shows a count and a "you are here" dot', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.goals = true; S.lists.push({ id: 'lgro', name: 'Groceries', c: '#F5A35A', space: '', loose: true }); save(); applySettings(); goHome(); });
  for (const k of ['lists', 'modes', 'spaces']) await expect(page.locator(`#sLists .sb-lbl[data-sbk="${k}"]`)).toBeVisible();
  const spaces = page.locator('#sLists .sb-lbl[data-sbk="spaces"]');
  await spaces.click();
  await expect(page.locator('#sLists .sb-sec[data-sb="spaces"]')).toHaveClass(/shut/);
  await expect(page.locator('#sLists [data-sp]').first()).toBeHidden();
  await expect(spaces.locator('.sb-n')).toHaveText(String(await page.evaluate(() => S.spaces.length)));
  // stays folded after a reload; the open space shows a dot on the folded label
  await page.reload();
  await page.waitForFunction(() => typeof S === 'object');
  await page.evaluate(() => { S.onboarded = true; openSpaceSide(S.spaces[0].id); });
  await expect(page.locator('#sLists .sb-sec[data-sb="spaces"]')).toHaveClass(/shut/);
  await expect(page.locator('#sLists .sb-lbl[data-sbk="spaces"] .sb-here')).toHaveCount(1);
  // keyboard too (back on Home: inside a space the computer hides the sidebar in full-width mode)
  await page.evaluate(() => goHome());
  await page.locator('#sLists .sb-lbl[data-sbk="spaces"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#sLists .sb-sec[data-sb="spaces"]')).not.toHaveClass(/shut/);
  await expect(page.locator('#sLists [data-sp]').first()).toBeVisible();
  // other sections fold on their own
  await page.locator('#sLists .sb-lbl[data-sbk="lists"]').click();
  await expect(page.locator('#sLists .sb-sec[data-sb="lists"]')).toHaveClass(/shut/);
  await expect(page.locator('#sLists .sb-sec[data-sb="modes"]')).not.toHaveClass(/shut/);
  noErrors(errors);
});
