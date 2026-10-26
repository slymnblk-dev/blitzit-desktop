// Phone Home: Today, one "Also today" card, Spaces; a bottom tab bar (Home · Inbox · Habits · Goals, +) once a mode is on.
// Inside a space the space's own bar stays; computers keep the sidebar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('phone Home: Also today card, Spaces, tab bar that moves between pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.habits = true; S.cfg.goals = true; S.cfg.wHabits = true; S.cfg.hwStyle = 'one'; S.cfg.homeAlso = 'list';
    S.habits = [{ id: 'h1', name: 'Drink water', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: Date.now() }];
    S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '', space: null, why: '', due: gPlus(2), created: Date.now(), star: true, ms: [{ id: 'm1', t: '10 km', done: false }] }];
    S.tasks.push({ id: 91, title: 'Renew passport', stage: 'backlog', list: null, est: 30, subs: [], notes: '', repeat: 'none', inbox: true, created: Date.now() });
    save(); applySettings(); goHome();
  });
  // Home: Today, then Also today (north star + next habit), then Spaces; no big Add task button
  await expect(page.locator('.app .also .ns-card')).toContainText('Run a half marathon');
  await expect(page.locator('.app .also .hw-one')).toContainText('Drink water');
  await expect(page.locator('.app .sec-h')).toHaveText(['Also today', 'Spaces']);
  await expect(page.locator('#addBtn')).toBeHidden();
  // icons only, named for screen readers; the + sits in the middle
  expect(await page.locator('#tabBar .tb').evaluateAll(b => b.map(x => x.getAttribute('aria-label')))).toEqual(['Home', 'Inbox', 'Habits', 'Goals']);
  await expect(page.locator('#tabBar .tb').first()).toHaveText('');
  await expect(page.locator('#tbInbox .tb-n')).toHaveText('1');
  expect(await page.locator('#tbIn > button').evaluateAll(b => b.map(x => x.id))).toEqual(['tbHome', 'tbInbox', 'tbAdd', 'tbHabits', 'tbGoals']);
  await expect(page.locator('#tbHome')).toHaveAttribute('aria-current', 'page');
  // Done on the habit row ticks it (and turns coral)
  await page.locator('.app .also .hw-done').click();
  expect(await page.evaluate(() => !!S.habits[0].done[today()])).toBe(true);
  // tabs: one page at a time
  await page.locator('#tbInbox').click();
  await expect(page.locator('#inboxPg')).toHaveClass(/on/);
  await expect(page.locator('#tbInbox')).toHaveAttribute('aria-current', 'page');
  await page.locator('#tbHabits').click();
  await expect(page.locator('#rhythmPg')).toHaveClass(/on/);
  expect(await page.evaluate(() => ibOn)).toBe(false);
  // + on Habits starts a habit, on Goals a goal
  await page.locator('#tbAdd').click();
  await expect(page.locator('#addKinds [data-ak="habit"]')).toHaveClass(/on/);
  await page.evaluate(() => closeSheets());
  await page.waitForTimeout(300);
  await page.locator('#tbGoals').click();
  await expect(page.locator('#goalsPg')).toHaveClass(/on/);
  await page.locator('#tbAdd').click();
  await expect(page.locator('#addKinds [data-ak="goal"]')).toHaveClass(/on/);
  await page.evaluate(() => closeSheets());
  await page.waitForTimeout(300);
  // a goal page sits under Goals; tapping Goals again goes back to all goals
  await page.locator('#goalsPg .g-card').first().click();
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  await expect(page.locator('#tbGoals')).toHaveAttribute('aria-current', 'page');
  await page.locator('#tbGoals').click();
  await expect(page.locator('#gdPg')).not.toHaveClass(/on/);
  await expect(page.locator('#goalsPg')).toHaveClass(/on/);
  await page.locator('#tbHome').click();
  expect(await page.evaluate(() => [glOn, gdOn, rhOn, ibOn])).toEqual([false, false, false, false]);
  // inside a space: its own bar, no tabs
  await page.evaluate(() => openSpace(S.spaces[0].id));
  await expect(page.locator('#tabBar')).toBeHidden();
  await expect(page.locator('#addBtn')).toBeVisible();
  // everything off: no tabs, the Add task button is back
  await page.evaluate(() => { S.cfg.habits = false; S.cfg.goals = false; S.cfg.inbox = false; save(); applySettings(); goHome(); });
  await expect(page.locator('#tabBar')).toBeHidden();
  await expect(page.locator('#addBtn')).toBeVisible();
  await expect(page.locator('.app .also')).toHaveCount(0);
  noErrors(errors);
});

test('computers keep the sidebar: no tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; save(); applySettings(); goHome(); });
  await expect(page.locator('#tabBar')).toBeHidden();
  noErrors(errors);
});

test('phone Home: Also today as Switch (default) or Tiles; the KPI shows as a ring row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.habits = true; S.cfg.goals = true; S.cfg.wHabits = true; S.cfg.hwStyle = 'one'; S.cfg.mx = true;
    S.habits = [{ id: 'h1', name: 'Drink water', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: Date.now() }];
    S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '', space: null, why: '', due: gPlus(2), created: Date.now(), star: true, ms: [{ id: 'm1', t: '10 km', done: false }] }];
    S.kpis = [{ id: 1, space: S.spaces[0].id, name: 'Outreach messages', target: 50, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: Date.now(), log: [{ id: 9, at: Date.now(), v: 12 }] }];
    save(); applySettings(); goHome();
  });
  // Switch: pills, one part at a time
  await expect(page.locator('.app .hl-pills [data-hltab]')).toHaveText(['Habits', 'Goal', 'KPIs']);
  await expect(page.locator('.app .hl-sw .hw-one')).toContainText('Drink water');
  await expect(page.locator('.app .hl-sw .ns-card')).toHaveCount(0);
  await page.locator('.app [data-hltab="goal"]').click();
  await expect(page.locator('.app .hl-sw .ns-card')).toContainText('Run a half marathon');
  await page.locator('.app [data-hltab="mx"]').click();
  await expect(page.locator('.app .hl-sw .mxw-rr')).toContainText('Outreach messages');
  await expect(page.locator('.app .hl-sw .mxw-rg b')).toHaveText('12');
  // the round + opens the KPI ready to log
  await page.locator('.app .hl-sw .mxw-plus').click();
  await expect(page.locator('#mxPg')).toHaveClass(/on/);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  // Tiles: goal and habits side by side, KPI below; Done on the habit tile ticks it
  await page.evaluate(() => setCfg('homeAlso', 'tiles'));
  await expect(page.locator('.app .hl-pair .hl-tile')).toHaveCount(2);
  await expect(page.locator('.app .hl-tiles .mxw-rr')).toHaveCount(1);
  await page.locator('.app .hl-hab .hw-done').click();
  expect(await page.evaluate(() => !!S.habits[0].done[today()])).toBe(true);
  noErrors(errors);
});
