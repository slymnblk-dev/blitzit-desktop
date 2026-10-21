// Inbox: add ideas with steps, send to a list's Backlog. Limits: 10 per stage per list, 10 steps per task.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('inbox: capture, steps, send to backlog; hidden everywhere else; can be turned off', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.locator('#sInbox').click();
  await expect(page.locator('#inboxPg')).toHaveClass(/on/);
  await page.fill('#ibNew', 'Start a podcast'); await page.press('#ibNew', 'Enter');
  await expect(page.locator('.ib-r')).toHaveCount(1);
  await expect(page.locator('#sInbox .n')).toHaveText('1');
  // inbox ideas don't show on boards or in counts
  expect(await page.evaluate(() => S.tasks.filter(shown).some(t => t.title === 'Start a podcast'))).toBe(false);
  // opens the same details sheet as a task: add 10 steps, no more
  await page.locator('.ib-r .row-in .title').first().click();
  await expect(page.locator('#detailSheet')).toHaveClass(/on/);
  for (let i = 0; i < 11; i++) { await page.fill('#dSubIn', 'Step ' + i); await page.press('#dSubIn', 'Enter'); }
  expect(await page.evaluate(() => S.tasks.find(t => t.title === 'Start a podcast').subs.length)).toBe(10);
  // send to a list
  await page.locator('#dComplete').click();
  const l = await page.evaluate(() => S.lists[0].id);
  await page.locator(`#dPicker .pk[data-v="${l}"]`).click();
  await expect.poll(() => page.evaluate(() => { const t = S.tasks.find(x => x.title === 'Start a podcast'); return t && !t.inbox && t.stage === 'backlog' && t.list; })).toBe(l);
  await expect(page.locator('.ib-r')).toHaveCount(0);
  // turn it off
  await page.evaluate(() => { setCfg('inbox', false); render(); });
  await expect(page.locator('#sInbox')).toHaveCount(0);
  await expect(page.locator('#inboxPg')).not.toHaveClass(/on/);
  noErrors(errors);
});

test('limits: max 10 per stage in a list, max 10 steps per task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const l = S.lists[0], n = stageCount(l.id, 'week');
    for (let i = n; i < STAGE_MAX; i++) S.tasks.push(newTask('Fill ' + i, 'week', l.id, 30));
    save(); return { l: l.id, room: stageRoom(l.id, 'week'), today: stageRoom(l.id, 'today') };
  });
  expect(r.room).toBe(false);
  expect(r.today).toBe(true);
  // moving another task into the full stage is refused
  const moved = await page.evaluate(l => { const t = S.tasks.find(x => shown(x) && x.list === l && x.stage === 'today'); const ok = canPut(t.list, 'week', t); return ok; }, r.l);
  expect(moved).toBe(false);
  await expect(page.locator('#toastMsg')).toContainText('already has 10');
  // steps
  const steps = await page.evaluate(() => { const t = S.tasks.find(shown); t.subs = Array.from({ length: 10 }, (_, i) => ({ id: newId(), t: 's' + i, done: false })); return canStep(t); });
  expect(steps).toBe(false);
  noErrors(errors);
});
