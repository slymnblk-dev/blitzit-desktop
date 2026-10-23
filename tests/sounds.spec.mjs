// Interface sounds: on by default, can be turned off in Settings, never break anything.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('sounds: on by default, play on actions, switch off in Settings', async ({ page }) => {
  const errors = await openApp(page);
  expect(await page.evaluate(() => S.cfg.uiSounds)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { S.space = S.spaces[0].id; S.list = 'all'; S.stage = 'week'; render(); });
  await page.evaluate(() => { window.__sfxLog = []; });
  await page.locator('#list .row .check').first().click();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => __sfxLog)).toContain('done');
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('[data-tg="uiSounds"]').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => S.cfg.uiSounds)).toBe(false);
  await page.evaluate(() => { closeSettings(); __sfxLog.length = 0; const l = S.lists.find(x => x.space === S.space); S.tasks.unshift(newTask('Quiet one', 'week', l.id, 15)); S.stage = 'week'; render(); });
  await page.locator('#list .row .check').first().click();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => __sfxLog)).toEqual([]);
  noErrors(errors);
});

test('sounds: one finish sound per tick, steps in focus, style page lets you try and pick', async ({ page }) => {
  const errors = await openApp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { window.__sfxLog = []; S.space = S.spaces[0].id; S.list = 'all'; S.stage = 'week'; render(); });
  await page.locator('#list .row .check').first().click();
  await page.waitForTimeout(1500);
  expect((await page.evaluate(() => __sfxLog)).filter(x => x === 'done')).toHaveLength(1);   // not twice
  // focus: ticking a step plays a sound (both looks)
  for (const look of ['classic', 'tide']) {
    await page.evaluate(look => { __sfxLog.length = 0; S.cfg.focusStyle = look; const l = S.lists[0]; const t = newTask('Steps ' + look, 'today', l.id, 30); t.subs = [{ id: 901, t: 'A', done: false }, { id: 902, t: 'B', done: false }]; S.tasks.unshift(t); look === 'tide' ? startTide([t]) : startBlitz([t]); }, look);
    await page.waitForTimeout(500);
    await page.locator(look === 'tide' ? '#tStep' : '#fSteps [data-fst]').first().click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => __sfxLog)).toContain('tick');
    await page.evaluate(look => { try { look === 'tide' ? tideLeave() : closeFocus(); } catch (e) {} }, look);
    await page.waitForTimeout(300);
  }
  // Sounds page
  await page.evaluate(() => { __sfxLog.length = 0; openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('[data-page="sounds"]').click();
  await expect(page.locator('.snd')).toHaveCount(9);
  await page.locator('[data-snd="marimba"]').click();
  expect(await page.evaluate(() => S.cfg.sfxStyle)).toBe('marimba');
  await expect(page.locator('[data-snd="marimba"]')).toHaveClass(/on/);
  await page.locator('[data-sndtry="win"]').click();
  expect(await page.evaluate(() => __sfxLog)).toEqual(['try:done', 'try:win']);
  await page.locator('#subBack').click();
  await expect(page.locator('[data-page="sounds"] .hint')).toContainText('Marimba');
  noErrors(errors);
});
