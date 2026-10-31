// Mode extras: Plan (tomorrow, calendar import, resize), Routines (reminder, counts as a habit, Home card),
// Journal (link a task, evening reminder, search).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const ICS = (d0, d1) => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Team stand-up
DTSTART:${d0}T093000
DTEND:${d0}T094500
RRULE:FREQ=DAILY
END:VEVENT
BEGIN:VEVENT
SUMMARY:Dentist
DTSTART:${d1}T140000
DURATION:PT1H
END:VEVENT
BEGIN:VEVENT
SUMMARY:Holiday
DTSTART;VALUE=DATE:${d0}
END:VEVENT
END:VCALENDAR`;

test('Plan: tomorrow, calendar import, resize a block', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.plan = true; S.cfg.planFrom = 0; S.cfg.planTo = 1440; S.tasks.find(t => t.stage === 'week' && !t.inbox).title = 'Week task'; save(); applySettings(); goHome(); });
  await page.locator('#sPlan').click();
  // tomorrow offers Today and This week tasks
  await page.locator('#planPg [data-pnday="1"]').click();
  await expect(page.locator('#planPg .pn-l .pn-chip[data-pnplace]', { hasText: 'Week task' })).toHaveCount(1);
  await page.locator('#planPg [data-pnauto]').click();
  const tm = await page.evaluate(() => pnTomorrow());
  const wk = await page.evaluate(() => S.tasks.find(t => t.title === 'Week task'));
  expect(wk.pl.d).toBe(tm);
  expect(wk.pl.s).toBe(0); // the day starts at 0:00 here, not now
  // on its day it moves to Today by itself
  await page.evaluate(tm => { pnRollDay = null; const t = S.tasks.find(x => x.title === 'Week task'); t.pl.d = today(); render(); }, tm);
  await expect.poll(() => page.evaluate(() => S.tasks.find(t => t.title === 'Week task').stage)).toBe('today');
  // calendar import: the stand-up (daily) today and tomorrow, the dentist tomorrow, no all-day event
  await page.locator('#planPg [data-pnday="0"]').click();
  const [d0, d1] = await page.evaluate(() => [today().replace(/-/g, ''), pnTomorrow().replace(/-/g, '')]);
  await page.evaluate(txt => pnIcsImport(txt), ICS(d0, d1));
  expect(await page.evaluate(() => S.blocks.filter(b => b.cal).map(b => [b.t, b.d === today() ? 0 : 1, b.s, b.len]).sort())).toEqual([['Dentist', 1, 840, 60], ['Team stand-up', 0, 570, 15], ['Team stand-up', 1, 570, 15]]);
  await expect(page.locator('#planPg .pn-blk.busy', { hasText: 'Team stand-up' })).toHaveCount(1);
  // importing again replaces, never doubles
  await page.evaluate(txt => pnIcsImport(txt), ICS(d0, d1));
  expect(await page.evaluate(() => S.blocks.filter(b => b.cal).length)).toBe(3);
  // resize the stand-up: drag its bottom edge down 30 minutes
  const rs = page.locator('#planPg .pn-blk.busy .pn-rs').first();
  await rs.scrollIntoViewIfNeeded();
  const b = await rs.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 33 * 1.1, { steps: 6 }); await page.mouse.up();
  expect(await page.evaluate(() => S.blocks.find(x => x.cal && x.d === today()).len)).toBe(45);
  await expect(page.locator('#cxPop.on')).toHaveCount(0);
  noErrors(errors);
});

test('Routines: reminder card, counts as a habit, next routine on Home', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.routines = true; S.cfg.habits = true; S.cfg.tabs = ['routines', 'habits'];
    const r = rtFromTpl(RT_TPL[0]); r.days = [0, 1, 2, 3, 4, 5, 6]; r.at = pnHM(Math.max(0, pnNowMin() - 5)).padStart(5, '0'); r.id = 501; S.routines = [r];
    save(); applySettings(); goHome(); });
  // Home shows the next routine with Start
  await expect(page.locator('#homeView .rt-home')).toContainText('Morning');
  // turn on the reminder and "counts as a habit" in the editor
  await page.locator('#tabBar [data-tab="routines"]').click();
  await page.locator('#routinesPg .rt-next .rt-nn').click();
  await page.locator('#routinesPg [data-rtrem="1"]').click();
  await page.locator('#routinesPg [data-rthab="1"]').click();
  const hid = await page.evaluate(() => S.routines[0].habit);
  expect(await page.evaluate(id => S.habits.some(h => h.id === id && h.name === 'Morning'), hid)).toBe(true);
  // the reminder fires once: a card with Start
  await page.evaluate(() => { remFired = {}; remTick(); });
  await expect(page.locator('#remCard')).toHaveClass(/on/);
  await expect(page.locator('#remCard')).toContainText('Time for your routine');
  await page.locator('#remCard [data-remgo]').click();
  await expect(page.locator('#rtPlay')).toHaveClass(/on/);
  for (let i = 0; i < 5; i++) await page.locator('#rtPlay [data-rpdone]').click();
  expect(await page.evaluate(id => !!S.habits.find(h => h.id === id).done[today()], hid)).toBe(true);
  await page.keyboard.press('Escape');
  // done: no more reminder, no Home card
  await page.evaluate(() => { remFired = {}; remTick(); });
  await expect(page.locator('#remCard')).not.toHaveClass(/on/);
  await page.evaluate(() => { closeRoutines(); goHome(); });
  await expect(page.locator('#homeView .rt-home')).toHaveCount(0);
  noErrors(errors);
});

test('Journal: link a task, search, evening reminder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.journal = true; S.cfg.tabs = ['journal'];
    const d = new Date(); d.setDate(d.getDate() - 3); S.journal = [{ id: 9, d: dkey(d), am: 'Call the bank first thing', pm: 'Ran by the river', mood: 4, en: [] }];
    save(); applySettings(); goHome(); });
  await page.locator('#tabBar [data-tab="journal"]').click();
  // link a task to the morning line
  await page.locator('#journalPg [data-jrlink]').click();
  const first = await page.locator('#cxPop button').first().textContent();
  await page.locator('#cxPop button').first().click();
  await expect(page.locator('#journalPg .jr-lk[data-jrtask]')).toContainText(first.trim());
  // finishing the task ticks it
  await page.evaluate(() => { const t = S.tasks.find(x => x.id === jrGet(today()).task); setStage(t, 'done'); save(); render(); });
  await expect(page.locator('#journalPg .jr-lk.done')).toHaveCount(1);
  await page.locator('#journalPg [data-jrunlink]').click();
  await expect(page.locator('#journalPg .jr-lk[data-jrtask]')).toHaveCount(0);
  // search
  await page.locator('#jrQ').fill('river');
  await expect(page.locator('#jrRows .jr-ent')).toHaveCount(1);
  await expect(page.locator('#jrRows mark')).toHaveText('river');
  await page.locator('#jrQ').fill('nothing like this');
  await expect(page.locator('#jrRows .jr-none')).toBeVisible();
  await page.locator('#jrQ').fill('');
  // evening reminder: on in Settings, fires when the evening line is empty
  await page.evaluate(() => { setCfg('jRem', true); S.cfg.jRemAt = pnHM(Math.max(0, pnNowMin() - 1)).padStart(5, '0'); closeSettings(); remFired = {}; remTick(); });
  await expect(page.locator('#remCard')).toContainText('what went well');
  await page.locator('#remCard [data-remlater]').click();
  await expect(page.locator('#remCard')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => remSnooze.jr - pnNowMin())).toBe(10);
  noErrors(errors);
});
