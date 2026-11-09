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
