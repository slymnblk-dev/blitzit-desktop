// Inbox, sort faster: on computers each item offers Today · This week · List on hover;
// "Sort inbox" walks through the items one at a time (phone and computer).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const seed = page => page.evaluate(() => {
  S.cfg.inbox = true;
  ['Renew passport', 'Book the dentist', 'Gift for mum'].forEach((t, i) => S.tasks.push({ id: 700 + i, title: t, stage: 'backlog', list: null, est: 30, subs: [], notes: '', repeat: 'none', inbox: true, created: Date.now() - i * 1000 }));
  save(); applySettings(); openInbox();
});

test('computer: point at an item, send it to Today or This week in one click', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await seed(page);
  const row = page.locator('#inboxPg [data-ibid="700"]');
  await row.hover();
  await expect(row.locator('[data-ibq="today"]')).toBeVisible();
  await row.locator('[data-ibq="today"]').click();
  const t = await page.evaluate(() => { const t = S.tasks.find(x => x.id === 700); return [t.inbox, t.stage, t.list === ibDefList()]; });
  expect(t).toEqual([false, 'today', true]);
  await expect(page.locator('#inboxPg [data-ibid]')).toHaveCount(2);
  await page.locator('#inboxPg [data-ibid="701"]').hover();
  await page.locator('#inboxPg [data-ibid="701"] [data-ibq="week"]').click();
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 701).stage)).toBe('week');
  noErrors(errors);
});

test('Sort inbox: one at a time, keys, skip, delete, a different list, then "Inbox sorted"', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await seed(page);
  await page.locator('#inboxPg [data-ibsort]').click();
  await expect(page.locator('#ibSort')).toHaveClass(/on/);
  await expect(page.locator('#ibsIn .ibs-t')).toHaveText('Renew passport');
  await page.keyboard.press('1');                                   // Today
  await expect(page.locator('#ibsIn .ibs-t')).toHaveText('Book the dentist');
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 700).stage)).toBe('today');
  await page.locator('#ibsIn [data-ibs="skip"]').click();           // Skip leaves it in the Inbox
  await expect(page.locator('#ibsIn .ibs-t')).toHaveText('Gift for mum');
  const other = await page.evaluate(() => { const l = S.lists.filter(x => spaceOf(x.space)).slice(-1)[0]; return l.id; });
  await page.locator('#ibsList').selectOption(String(other));       // into another list
  await page.locator('#ibsIn [data-ibs="backlog"]').click();        // Later
  await expect(page.locator('#ibsIn .ibs-end b')).toHaveText('Inbox sorted');
  expect(await page.evaluate(id => { const t = S.tasks.find(x => x.id === 702); return [t.inbox, t.stage, String(t.list) === String(id)]; }, other)).toEqual([false, 'backlog', true]);
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 701).inbox)).toBe(true);
  await page.locator('#ibsIn [data-ibs="close"]').click();
  await expect(page.locator('#ibSort')).not.toHaveClass(/on/);
  await expect(page.locator('#inboxPg')).toHaveClass(/on/);         // back on the Inbox
  noErrors(errors);
});

test('phone: Sort inbox works by tap; Escape stops without closing the Inbox; delete removes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page);
  await expect(page.locator('#inboxPg [data-ibq]').first()).toBeHidden();   // no hover actions on phones
  await page.locator('#inboxPg [data-ibsort]').click();
  await page.locator('#ibsIn [data-ibs="del"]').click();
  await expect(page.locator('#ibsIn .ibs-t')).toHaveText('Book the dentist');
  expect(await page.evaluate(() => S.tasks.some(x => x.id === 700))).toBe(false);
  await page.locator('#ibsIn [data-ibs="week"]').click();
  await expect(page.locator('#ibsIn .ibs-t')).toHaveText('Gift for mum');
  await page.keyboard.press('Escape');
  await expect(page.locator('#ibSort')).not.toHaveClass(/on/);
  await expect(page.locator('#inboxPg')).toHaveClass(/on/);
  noErrors(errors);
});
