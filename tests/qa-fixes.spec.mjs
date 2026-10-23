// QA round: deleting a space keeps its habits and goals (unless you choose), popups fit small phones,
// Esc closes the top page wherever focus is, one add sheet for Task · Note · Habit · Goal (with "#space 30m"),
// search finds everything grouped, and classic focus shows every step to tick or add.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

/* a habit and a goal in the first space; the goal's milestone has a task in that space's list */
async function seedSpace(page) {
  return page.evaluate(() => {
    S.cfg.habits = true; S.cfg.goals = true;
    const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id);
    S.habits = [{ id: 'h1', name: 'Stretch', e: '', space: sp.id, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: Date.now() }];
    const t = newTask('Run 8 km', 'week', l.id, 30); t.goal = 'g1'; t.ms = 'm1'; S.tasks.push(t);
    S.goals = [{ id: 'g1', name: 'Half marathon', e: '', space: sp.id, why: '', due: gPlus(3), created: Date.now(), ms: [{ id: 'm1', t: '10 km', done: false }] }];
    save(); render();
    return { sp: sp.id, name: sp.name };
  });
}

test('deleting a space: habits and goals stay by default, their milestone tasks too', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  const { sp, name } = await seedSpace(page);
  await page.evaluate(id => askDeleteSpace(id), sp);
  await expect(page.locator('#dlgCh')).toBeVisible();
  await expect(page.locator('#dlgCh legend')).toHaveText('1 habit and 1 goal in this space');
  await expect(page.locator('#dlgCh input[value="keep"]')).toBeChecked();
  await page.fill('#dlgIn', name);
  await page.locator('#dlgYes').click();
  const r = await page.evaluate(id => ({
    gone: !S.spaces.some(x => x.id === id), hb: S.habits.map(h => [h.name, h.space]), g: S.goals.map(g => [g.name, g.space]),
    items: S.goals[0].ms[0].items.map(i => i.t), task: S.tasks.some(t => t.title === 'Run 8 km'),
  }), sp);
  expect(r).toEqual({ gone: true, hb: [['Stretch', null]], g: [['Half marathon', null]], items: ['Run 8 km'], task: false });
  noErrors(errors);
});

test('deleting a space: "Delete them too" removes its habits and goals', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  const { sp, name } = await seedSpace(page);
  await page.evaluate(id => askDeleteSpace(id), sp);
  await page.locator('#dlgCh label', { hasText: 'Delete them too' }).click();
  await page.fill('#dlgIn', name);
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(() => [S.habits.length, S.goals.length])).toEqual([0, 0]);
  // a space with neither shows no choice
  await page.evaluate(() => askDeleteSpace(S.spaces[0].id));
  await expect(page.locator('#dlgCh')).toBeHidden();
  noErrors(errors);
});

test('popups fit a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.habits = true;
    S.habits = [{ id: 'h1', name: 'A habit with quite a long name to stretch the row', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: Date.now() }];
    S.tasks.push({ id: 77, title: 'A note', notes: 'A note\nwith a body', stage: 'backlog', list: null, est: 0, subs: [], repeat: 'none', inbox: true, note: true, created: Date.now() });
    save(); render(); openReorder();
  });
  for (const [sel, open] of [['#hbEd', null], ['#nbEd', () => { closeHbEdit(); openNote(77); }]]) {
    if (open) await page.evaluate(open);
    await page.waitForTimeout(350);
    const b = await page.locator(`${sel} .dlg-in`).boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(360);
  }
  noErrors(errors);
});

test('Esc closes the top page even after clicking an empty spot', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; S.cfg.closeDay = true; save(); render(); });
  const blurEsc = async () => { await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('Escape'); };
  for (const [open, on] of [['openInbox()', 'ibOn'], ['openReview()', 'rvOn'], ['openCloseDay()', 'cdOn'], ['openSetup()', 'gsOn']]) {
    await page.evaluate(open);
    await page.waitForTimeout(350);
    expect(await page.evaluate(on)).toBe(true);
    await blurEsc();
    expect(await page.evaluate(on), on).toBe(false);
  }
  // a note open over the Inbox: the note closes first, then the Inbox
  await page.evaluate(() => { S.tasks.push({ id: 78, title: 'N', notes: 'N', stage: 'backlog', list: null, est: 0, subs: [], repeat: 'none', inbox: true, note: true, created: Date.now() }); openInbox(); openNote(78); });
  await page.waitForTimeout(300);
  await blurEsc();
  expect(await page.evaluate(() => [nbId, ibOn])).toEqual([null, true]);
  await blurEsc();
  expect(await page.evaluate(() => ibOn)).toBe(false);
  noErrors(errors);
});

test('add sheet: "#space 45m" sets space and time; a goal goes straight to its milestones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  const sp = await page.evaluate(() => { S.cfg.habits = true; S.cfg.goals = true; S.goals = []; goHome(); save(); render(); return S.spaces[1]; });
  await page.locator('#addBtn').click();
  await expect(page.locator('#addKinds [data-ak]')).toHaveCount(4);
  await expect(page.locator('.ak-tip')).toContainText('#space');
  await page.fill('#newTitle', `Write report #${sp.name.toLowerCase()} 45m`);
  await expect(page.locator('#optSpace .opt.on')).toContainText(sp.name);
  await expect(page.locator('#optEst .opt.on')).toHaveText('45m');
  await page.locator('#saveBtn').click();
  const t = await page.evaluate(() => S.tasks.find(x => x.title === 'Write report'));
  expect([t.est, await page.evaluate(id => listOf(id).space, t.list)]).toEqual([45, sp.id]);
  // a habit needs no space
  await page.waitForTimeout(400);
  await page.locator('#addBtn').click();
  await page.locator('[data-ak="habit"]').click();
  await expect(page.locator('#addSpaceWrap')).toBeHidden();
  await expect(page.locator('[data-akhs=""]')).toHaveClass(/on/);
  await page.fill('#newTitle', 'Read');
  await page.locator('#saveBtn').click();
  expect(await page.evaluate(() => S.habits.find(h => h.name === 'Read').space)).toBe(null);
  // a goal: name and "by when" here, then the setup opens on First milestones
  await page.waitForTimeout(400);
  await page.locator('#addBtn').click();
  await page.locator('[data-ak="goal"]').click();
  await expect(page.locator('#saveBtn')).toHaveText('Next: milestones');
  await page.fill('#newTitle', 'Learn Spanish');
  await page.locator('[data-akgm="6"]').click();
  await page.locator('#saveBtn').click();
  await expect(page.locator('#gsPg')).toHaveClass(/on/);
  expect(await page.evaluate(() => [gsD.step, gsD.name, gsD.due === gPlus(6)])).toEqual([3, 'Learn Spanish', true]);
  noErrors(errors);
});

test('search finds tasks, notes, goals and habits, grouped', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.habits = true; S.cfg.goals = true;
    const l = S.lists[0]; S.tasks.push(newTask('Run 8 km', 'week', l.id, 30));
    S.tasks.push({ id: 79, title: 'Playlist', notes: 'Playlist\nsongs for the long run', stage: 'backlog', list: null, est: 0, subs: [], repeat: 'none', inbox: true, note: true, created: Date.now() });
    S.goals = [{ id: 'g1', name: 'Half marathon', e: '', space: null, why: '', due: gPlus(3), created: Date.now(), ms: [{ id: 'm1', t: 'Run 10 km', done: false }] }];
    S.habits = [{ id: 'h1', name: 'Morning run', e: '', space: null, days: [1, 2, 3, 4, 5], done: {}, created: Date.now() }];
    save(); render(); openSearch();
  });
  await expect(page.locator('#srchIn')).toHaveAttribute('placeholder', 'Search tasks, notes, goals and habits');
  await page.keyboard.type('run');
  await expect(page.locator('#srch .sr-h')).toHaveText(['Tasks', 'Notes', 'Goals', 'Habits']);
  await expect(page.locator('#srch [data-srg]')).toContainText('Milestone: Run 10 km');
  await expect(page.locator('#srch [data-srh]')).toContainText('Weekdays');
  await page.locator('#srch [data-srk="note"]').click();
  await expect(page.locator('#srch .sr-item')).toHaveCount(1);
  await expect(page.locator('#srchIn')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#nbEd')).toHaveClass(/on/);
  expect(await page.evaluate(() => [ibOn, nbId])).toEqual([true, 79]);
  noErrors(errors);
});

test('focus shows every step: tick, untick, add, keys never end the task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.focusStyle = 'classic'; const l = S.lists[0], t = newTask('Inbox zero', 'today', l.id, 30);
    t.subs = [{ id: 901, t: 'Flag urgent', done: true }, { id: 902, t: 'Reply to Sara', done: false }, { id: 903, t: 'Archive the rest', done: false }];
    S.tasks.unshift(t); save(); startBlitz([t]);
  });
  await page.waitForTimeout(500);
  const rows = page.locator('#fSteps .fs-r');
  await expect(rows).toHaveCount(3);
  await expect(page.locator('#fsN')).toHaveText('1 of 3');
  await rows.nth(1).click();
  await expect(page.locator('#fsN')).toHaveText('2 of 3');
  await expect(rows.nth(1)).toHaveAttribute('aria-label', 'Mark not done: Reply to Sara');
  await rows.nth(0).focus();
  await page.keyboard.press('Enter'); // unticks the step, doesn't finish the task
  await expect(page.locator('#fsN')).toHaveText('1 of 3');
  expect(await page.evaluate(() => [F.on, S.tasks[0].stage])).toEqual([true, 'today']);
  await page.locator('#fSteps [data-fsadd]').click();
  await page.keyboard.type('Clear the spam folder');
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(4);
  await page.keyboard.press('Escape'); // closes the field, not focus
  await expect(page.locator('#fsIn')).toHaveCount(0);
  expect(await page.evaluate(() => [F.on, S.tasks[0].subs.map(s => s.t)])).toEqual([true, ['Flag urgent', 'Reply to Sara', 'Archive the rest', 'Clear the spam folder']]);
  noErrors(errors);
});
