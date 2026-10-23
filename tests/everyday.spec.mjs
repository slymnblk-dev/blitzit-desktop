// Everyday touches: one + for everything (kinds only when modes add them), Close the day, starter picks, moments.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('one + for everything: Task · Note by default; habit and goal kinds when their modes are on', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.locator('#tbAdd:visible, #addBtn:visible').first().click(); // the tab bar's + when Inbox, Habits or Goals is on
  await expect(page.locator('#addSheet')).toHaveClass(/on/);
  await expect(page.locator('#addKinds [data-ak]')).toHaveCount(2); // Task · Note (the Inbox is on by default)
  await expect(page.locator('#saveBtn')).toHaveText('Add task');
  await page.evaluate(() => closeSheets());
  await page.evaluate(() => { S.cfg.inbox = false; save(); render(); });
  await page.waitForTimeout(300);
  await page.locator('#tbAdd:visible, #addBtn:visible').first().click(); // the tab bar's + when Inbox, Habits or Goals is on
  await expect(page.locator('#addKinds')).toBeHidden(); // everything off: just "Add task"
  await page.evaluate(() => { closeSheets(); S.cfg.inbox = true; save(); render(); });

  await page.evaluate(() => {
    S.cfg.habits = true;
    save(); render();
  });
  await page.waitForTimeout(300);
  await page.locator('#tbAdd:visible, #addBtn:visible').first().click(); // the tab bar's + when Inbox, Habits or Goals is on
  await expect(page.locator('#addKinds [data-ak]')).toHaveCount(3); // Task · Note · Habit
  // habit
  await page.locator('[data-ak="habit"]').click();
  await expect(page.locator('#saveBtn')).toHaveText('Add habit');
  await page.fill('#newTitle', 'Stretch');
  await page.locator('[data-akd="wk"]').click();
  await page.locator('#saveBtn').click();
  await expect.poll(() => page.evaluate(() => (S.habits || []).map(h => [h.name, h.days.join('')]))).toEqual([['Stretch', '12345']]);
  // note: several lines, pinned, saved to the Inbox
  await page.waitForTimeout(400);
  await page.locator('#tbAdd:visible, #addBtn:visible').first().click(); // the tab bar's + when Inbox, Habits or Goals is on
  await expect(page.locator('#addKinds [data-ak="task"]')).toHaveClass(/on/); // every open starts on Task
  await page.locator('[data-ak="note"]').click();
  await expect(page.locator('#newTitle')).toBeHidden();
  await expect(page.locator('#saveBtn')).toBeDisabled();
  await page.fill('#akNote', 'Podcast\nAsk Sam about episode two');
  await page.locator('[data-akpin]').click();
  await page.locator('#saveBtn').click();
  await expect.poll(() => page.evaluate(() => { const t = S.tasks.find(x => x.note); return t && [t.title, t.notes, t.pin, t.inbox]; })).toEqual(['Podcast', 'Podcast\nAsk Sam about episode two', true, true]);
  noErrors(errors);
});

test('close the day: evening card, tick habits, pick tomorrow\'s first task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.habits = true; S.cfg.closeDay = true; S.cfg.hbCiAt = 0;
    S.habits = [{ id: 'h1', name: 'Read', e: '📖', space: S.spaces[0].id, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: Date.now() }];
    save(); render(); goHome();
  });
  await expect(page.locator('.cd-home:visible')).toHaveCount(1);
  await expect(page.locator('.ci-home:not(.cd-home):visible')).toHaveCount(0); // replaces the habits check-in card
  await page.locator('.cd-home:visible [data-cdopen]').click();
  await expect(page.locator('#cdPg')).toHaveClass(/on/);
  await page.locator('#cdPg [data-hbt="h1"]').click();
  await expect.poll(() => page.evaluate(() => !!S.habits[0].done[today()])).toBe(true);
  const pick = await page.evaluate(() => +document.querySelectorAll('#cdPg [data-cdp]')[1].dataset.cdp);
  await page.locator('#cdPg [data-cdp]').nth(1).click();
  await page.locator('#cdGo').click();
  await expect(page.locator('#cdPg')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => S.cdDone === today())).toBe(true);
  expect(await page.evaluate(() => S.tasks[0].id)).toBe(pick);
  expect(await page.evaluate(() => S.tasks[0].stage)).toBe('today');
  await expect(page.locator('.cd-home:visible')).toHaveCount(0);
  noErrors(errors);
});

test('starter picks and the 7-day moment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; save(); openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-hbpick="0"]').click();
  await page.locator('#setIn [data-hbpick="2"]').click();
  await expect(page.locator('#setIn [data-hbstart]')).toHaveText('Add 2 habits');
  await page.locator('#setIn [data-hbstart]').click();
  await expect.poll(() => page.evaluate(() => S.habits.map(h => h.name))).toEqual(['Drink water', 'Read 20 pages']);
  await expect(page.locator('#setIn .st-pick')).toHaveCount(0); // gone once you have habits
  await page.evaluate(() => closeSettings());
  // six days kept, tick today → 7 in a row → the moment
  await page.evaluate(() => { const h = S.habits[0]; h.created = Date.now() - 10 * 864e5; for (let i = 1; i <= 6; i++) { const d = new Date(); d.setDate(d.getDate() - i); h.done[dkey(d)] = 1; } save(); hbToggle(h.id); });
  await expect(page.locator('#moPg')).toHaveClass(/on/);
  await expect(page.locator('#moPg .mo-big')).toHaveText('7 days.');
  await page.locator('#moGo').click();
  await expect(page.locator('#moPg')).not.toHaveClass(/on/);
  // untick and tick again the same day: no second moment
  await page.evaluate(() => { hbToggle(S.habits[0].id); hbToggle(S.habits[0].id); });
  await page.waitForTimeout(800);
  await expect(page.locator('#moPg')).not.toHaveClass(/on/);
  noErrors(errors);
});
