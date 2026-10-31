// Wins (optional mode): a jar that fills itself with tasks done, habit streaks, milestones, goals achieved and won days,
// plus wins you add yourself. Phone: a Wins tab. Computer: "Wins" under Modes in the sidebar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('Wins is off by default; on, it gathers the week and keeps your own wins (add, delete, undo, sync, backup)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; save(); applySettings(); goHome(); });
  await expect(page.locator('#tabBar [data-tab="wins"]')).toHaveCount(0);
  await page.evaluate(() => {
    S.cfg.wins = true;
    const t = S.tasks.find(x => x.stage === 'today' && !x.inbox); t.stage = 'done'; t.doneAt = Date.now();
    // a habit kept 7 days running: a 7-day streak lands in the jar today
    const done = {}; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); done[dkey(d)] = 1; }
    S.habits = [{ id: 'h1', name: 'Drink water', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done, created: Date.now() - 30 * 864e5 }];
    S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '', space: null, why: '', due: gPlus(3), created: Date.now(), ms: [{ id: 'm1', t: '10 km', done: true, doneAt: Date.now() }, { id: 'm2', t: '21 km', done: false }] }];
    S.cfg.goals = true; save(); applySettings(); goHome();
  });
  await page.locator('#tabBar [data-tab="wins"]').click();
  await expect(page.locator('#winsPg')).toHaveClass(/on/);
  await expect(page.locator('#winsPg .wn-it')).toContainText(['Milestone: 10 km', '7 days in a row: Drink water']);
  const n0 = await page.evaluate(() => wnCollect(0).list.length);
  await expect(page.locator('#winsPg .wn-n')).toHaveText(String(n0));
  // add your own win: the + on the Wins tab opens the line
  await page.locator('#tbAdd').click();
  await expect(page.locator('#wnNew')).toBeFocused();
  await page.keyboard.type('Called grandma');
  await page.keyboard.press('Enter');
  await expect(page.locator('#winsPg .wn-n')).toHaveText(String(n0 + 1));
  const w = await page.evaluate(() => S.wins[0]);
  expect([w.t, w.kind]).toEqual(['Called grandma', 'mine']);
  // it travels with sync and backups
  expect(await page.evaluate(() => [JSON.parse(backupData()).wins.length, localDoc().wins.length])).toEqual([1, 1]);
  // delete from ⋯, then Undo brings it back
  await page.locator(`#winsPg [data-wnm="${w.id}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Delete win' }).click();
  await expect(page.locator('#winsPg .wn-n')).toHaveText(String(n0));
  await page.locator('#undoBtn').click();
  await expect(page.locator('#winsPg .wn-n')).toHaveText(String(n0 + 1));
  // the week reel
  await page.locator('#winsPg [data-wnreel]').click();
  await expect(page.locator('#wnReel')).toHaveClass(/on/);
  await expect(page.locator('#wnReel .wn-rbig')).toHaveText(String(n0 + 1));
  await page.keyboard.press('Escape');
  await expect(page.locator('#wnReel')).not.toHaveClass(/on/);
  await expect(page.locator('#winsPg')).toHaveClass(/on/);
  // last week, and back (next week is never reachable)
  await page.locator('#winsPg [data-wnw="-1"]').click();
  await expect(page.locator('#winsPg .pg-eye').first()).toContainText('Last week');
  await page.locator('#winsPg [data-wnw="1"]').click();
  await expect(page.locator('#winsPg [data-wnw="1"]')).toBeDisabled();
  // another tab closes Wins; turning the mode off removes the tab, the data stays
  await page.locator('#tbHome').click();
  await expect(page.locator('#winsPg')).not.toHaveClass(/on/);
  await page.evaluate(() => setCfg('wins', false));
  await expect(page.locator('#tabBar [data-tab="wins"]')).toHaveCount(0);
  expect(await page.evaluate(() => S.wins.length)).toBe(1);
  noErrors(errors);
});

test('finishing the last Today task puts a won day in the jar; the computer sidebar opens Wins', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.wins = true; S.tasks.filter(t => t.stage === 'today').slice(1).forEach(t => { t.stage = 'week'; }); save(); applySettings(); openSpace(S.spaces[0].id); });
  await page.locator('.col[data-s="today"] .row .check').first().click();
  await expect.poll(() => page.evaluate(() => (S.wins || []).filter(w => w.kind === 'day').length)).toBe(1);
  await page.evaluate(() => goHome());
  await page.locator('#sWins').click();
  await expect(page.locator('#winsPg')).toHaveClass(/on/);
  await expect(page.locator('#winsPg .wn-it').first()).toContainText('You won the day');
  await page.keyboard.press('Escape');
  await expect(page.locator('#winsPg')).not.toHaveClass(/on/);
  // Settings → Modes has a Wins card
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .md-card[data-md="wins"]')).toContainText('Wins');
  noErrors(errors);
});
