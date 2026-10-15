// Search & filter: find tasks everywhere; filter the board by priority / tags; can be turned off.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const seed = page => page.evaluate(() => {
  const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id), other = S.lists.find(x => x.space !== sp.id);
  const a = newTask('Quarterly report draft', 'week', l.id, 30); a.pri = 'high'; a.tags = [addListTag(l, 'work')];
  const b = newTask('Buy oat milk', 'week', l.id, 15); b.pri = 'low';
  const c = newTask('Report bug to vendor', 'today', other.id, 15);
  S.tasks.unshift(a, b, c); S.space = sp.id; S.list = 'all'; S.stage = 'week'; render();
  return { a: a.id, b: b.id, c: c.id };
});

test('desktop: search finds tasks in every space and opens one', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const ids = await seed(page);
  await page.locator('.m-right .srch-btn').click();
  await expect(page.locator('#srch')).toHaveClass(/on/);
  await page.keyboard.type('report');
  await expect(page.locator(`#srch [data-srt="${ids.a}"]`)).toBeVisible();
  await expect(page.locator(`#srch [data-srt="${ids.c}"]`)).toBeVisible();         // other space too
  await expect(page.locator(`#srch [data-srt="${ids.b}"]`)).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#detailSheet')).toHaveClass(/on/);
  await expect(page.locator('#srch')).not.toHaveClass(/on/);
  noErrors(errors);
});

test('filters narrow the board, show a chip, and clear', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const ids = await seed(page);
  await page.keyboard.press('/');
  await expect(page.locator('#srch')).toHaveClass(/on/);
  await page.locator('#srch [data-sfp="high"]').click();
  await expect(page.locator(`.col .row[data-id="${ids.a}"]`)).toHaveCount(1);
  await expect(page.locator(`.col .row[data-id="${ids.b}"]`)).toHaveCount(0);
  await page.locator('#srch [data-sfp="high"]').click();
  await page.locator('#srch [data-sft="work"]').click();
  await expect(page.locator(`.col .row[data-id="${ids.b}"]`)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#srchChip')).toBeVisible();
  await expect(page.locator('#srchChip')).toContainText('#work');
  await page.locator('#srchChip [data-sfclear]').click();
  await expect(page.locator('#srchChip')).toBeHidden();
  await expect(page.locator(`.col .row[data-id="${ids.b}"]`)).toHaveCount(1);
  noErrors(errors);
});

test('phone: search button sits left of the profile; setting hides it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page);
  const btn = page.locator('.top-r .srch-btn');
  await expect(btn).toBeVisible();
  const [sb, pb] = [await btn.boundingBox(), await page.locator('#setBtn').boundingBox()];
  expect(sb.x).toBeLessThan(pb.x);
  await btn.click();
  await page.keyboard.type('oat');
  await expect(page.locator('#srch .sr-item')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await page.locator('[data-tg="search"]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => closeSettings());
  await expect(btn).toBeHidden();
  noErrors(errors);
});
