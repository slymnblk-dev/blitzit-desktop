// Polish pass (0.316): the full review. ① ③ ④ ⑤ ⑥ ⑦ apply to both designs; ② and the bigger hero task are Flow only.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const phone = page => page.setViewportSize({ width: 390, height: 844 });
const desk = page => page.setViewportSize({ width: 1400, height: 900 });
const setUi = (page, ui, extra = {}) => page.evaluate(([ui, x]) => { S.cfg.ui = ui; Object.assign(S.cfg, x); save(); applySettings(); goHome(); render(); }, [ui, extra]);
const todayTask = page => page.evaluate(() => { const t = S.tasks.find(x => shown(x) && x.stage !== 'done'); t.stage = 'today'; save(); render(); return t.id; });

test('① Home on phones: no theme switch on top, tab names under icons; Flow hero shows the task biggest', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await todayTask(page);
  for (const ui of ['classic', 'flow']) {
    await setUi(page, ui, { habits: true });
    await expect(page.locator('#ttPhone')).toBeHidden();
    await expect(page.locator('.tb .tb-l').first()).toBeVisible();
  }
  const sz = await page.evaluate(() => [getComputedStyle(document.querySelector('#homeView .td-title')).fontSize, getComputedStyle(document.querySelector('#homeView .td-head')).display]);
  expect(sz).toEqual(['24px', 'none']);
  await setUi(page, 'classic');
  await expect(page.locator('#homeView .td-head')).toBeVisible();                    // Classic keeps its "Today" card as it was
  await desk(page);                                                                  // computers keep the theme switch
  await expect(page.locator('.tt-btn:visible').first()).toBeVisible();
  noErrors(errors);
});

test('② Flow Focus screen is calm (no coral wall) with the default colour; a picked focus colour and Classic stay as they were', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await todayTask(page);
  const bg = () => page.evaluate(() => getComputedStyle(document.getElementById('focus')).backgroundColor);
  const go = () => page.evaluate(() => startBlitz(S.tasks.filter(t => t.stage === 'today' && shown(t))));
  await setUi(page, 'flow', { theme: 'dark' }); await go();
  await expect.poll(bg).toBe('rgb(14, 15, 18)');
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('focus'), '::before').animationName)).toBe('flFocusAur');
  await page.evaluate(() => { S.cfg.focusColor = 'teal'; applyFocusColor(); });        // the user's own colour still wins
  await expect.poll(bg).toBe('rgb(46, 200, 192)');
  await page.evaluate(() => { S.cfg.focusColor = 'red'; applyFocusColor(); S.cfg.ui = 'classic'; applySettings(); });
  await expect.poll(bg).not.toBe('rgb(14, 15, 18)');                                  // Classic keeps its bold focus wall
  noErrors(errors);
});

test('③ One page header: no tagline eyebrows, no Beta badge on page titles (Beta stays in Settings → Modes)', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await setUi(page, 'flow', { habits: true, wins: true });
  await page.evaluate(() => openInbox());
  await expect(page.locator('#ibIn .ib-eye')).toHaveCount(0);
  await page.evaluate(() => hbOpenHabits());
  await expect(page.locator('#rhIn .hp-eye')).toHaveCount(0);
  await page.evaluate(() => openWins());
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#winsPg h1.ib-h'), '::after').content)).toBe('none');
  await page.evaluate(() => { openSettings(); });
  await expect(page.locator('#setIn .set-eye')).toHaveCount(0);
  await page.evaluate(() => { setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .bt-tag')).toHaveText('Beta');
  noErrors(errors);
});

test('④ One button system: page main actions use the accent pill, Auto-plan is a grey pill, Flow Win the day stays coral on every stage', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await setUi(page, 'flow', { theme: 'dark', plan: true });
  const bg = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const coloured = c => { const [r, g, b] = c.match(/\d+/g).map(Number); return Math.max(r, g, b) - Math.min(r, g, b) > 60; }; // a real colour, not white/black/grey
  await page.evaluate(() => openCloseDay());
  expect(coloured(await bg('#cdGo'))).toBe(true);                                     // the accent, like every other main button (was white)
  await page.evaluate(() => openReview());
  expect(coloured(await bg('#rvDone'))).toBe(true);
  await page.evaluate(() => openPlan());
  expect(await bg('[data-pnauto]')).toBe('rgb(34, 37, 43)');
  await page.evaluate(() => { openSpace(S.spaces[0].id); S.stage = 'week'; render(); });
  expect(await bg('#goBtn')).toBe('rgb(255, 138, 91)');
  await setUi(page, 'classic'); await page.evaluate(() => { openSpace(S.spaces[0].id); S.stage = 'week'; render(); });
  expect(await bg('#goBtn')).not.toBe('rgb(255, 138, 91)');                           // Classic keeps its stage colours
  noErrors(errors);
});

test('⑤ Space on phones: stage tabs at the top by default (Thumb-first is a switch), list name only with 2+ lists, calm Flow title', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await setUi(page, 'flow');
  expect(await page.evaluate(() => [S.cfg.flThumb, document.documentElement.dataset.fl.split(' ').includes('thumb')])).toEqual([false, false]);
  await page.evaluate(() => { openSpace(S.spaces[0].id); S.stage = 'today'; render(); });
  const g = await page.locator('#gauge').boundingBox(), l = await page.locator('#list').boundingBox();
  expect(g.y).toBeLessThan(l.y);                                                        // tabs above the tasks
  const sp = await page.evaluate(() => S.spaces[0].id);
  const lists = await page.evaluate(id => S.lists.filter(x => x.space === id).length, sp);
  await expect(page.locator('#list .row .tag')).toHaveCount(lists > 1 ? await page.locator('#list .row').count() : 0);
  await page.evaluate(id => { S.lists.push({ id: 'l2x', name: 'Second', c: '#5AB8F5', space: id }); const t = S.tasks.find(x => shown(x) && listOf(x.list).space === id && x.stage === 'today'); render(); }, sp);
  expect(await page.locator('#list .row .tag').count()).toBeGreaterThan(0);           // two lists: the name helps again
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.hero h1')).color)).toBe(await page.evaluate(() => getComputedStyle(document.body).color));
  await page.evaluate(() => { S.cfg.flThumb = true; applySettings(); render(); });     // the switch still works
  expect(await page.evaluate(() => document.documentElement.dataset.fl.split(' ').includes('thumb'))).toBe(true);
  noErrors(errors);
});

test('⑥ One empty state: Habits and Goals use the same card as Metrics (no dashed box, no lone button), the button still works', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  for (const ui of ['flow', 'classic']) {
    await setUi(page, ui, { habits: true, goals: true });
    await page.evaluate(() => hbOpenHabits());
    const st = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#rhythmPg .rh-empty')); return [c.borderStyle, c.borderRadius, c.backgroundColor !== 'rgba(0, 0, 0, 0)']; });
    expect(st).toEqual(['none', '22px', true]);
    await page.evaluate(() => openGoals());
    await expect(page.locator('#goalsPg .pl-empty .dh-empty b')).toHaveText('No goals yet');
    await expect(page.locator('#goalsPg .ga-first')).toHaveCount(0);
  }
  await page.locator('#goalsPg .pl-empty [data-gnew]').click();                        // still opens the new goal sheet
  await expect(page.locator('#gsPg #gsIn .gs-n')).toHaveText('1 of 3');
  noErrors(errors);
});

test('⑦ Search dims the page behind it (one layer); tapping the dim area closes it', async ({ page }) => {
  for (const vp of [[390, 844], [1400, 900]]) {
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    const errors = await openApp(page);
    await setUi(page, 'flow');
    await page.evaluate(() => { openSpace(S.spaces[0].id); render(); openSearch(); });
    await expect(page.locator('#srch.on')).toBeVisible();
    const dim = await page.evaluate(() => [getComputedStyle(document.body, '::before').backgroundColor, getComputedStyle(document.body, '::after').opacity]);
    expect(dim[0]).toMatch(/rgba\(8, 9, 12, 0\.(48|2)\)/);
    if (vp[0] < 1100) expect(dim[1]).toBe('0');
    await page.mouse.click(vp[0] / 2, vp[1] - 200);
    await expect(page.locator('#srch.on')).toHaveCount(0);
    noErrors(errors);
  }
});
