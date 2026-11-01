// Inbox, sort faster: on computers each item offers Today · This week · List on hover;
// items are ordered by the day they were added (newest first); there is no separate Sort any more.
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

test('phone: no hover actions; the Sort button is gone (items are ordered by the day they were added)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page);
  await expect(page.locator('#inboxPg [data-ibq]').first()).toBeHidden();
  await expect(page.locator('#inboxPg [data-ibsort]')).toHaveCount(0);
  await expect(page.locator('#inboxPg [data-ibid]')).toHaveCount(3);
  expect(await page.locator('#inboxPg [data-ibid]').evaluateAll(r => r.map(x => x.dataset.ibid))).toEqual(['700', '701', '702']); // newest first
  noErrors(errors);
});
