// Interface sounds: always on (Glass), never break anything. Their settings are gone (0.270).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('sounds: always on (Glass), play on actions, no switch in Settings', async ({ page }) => {
  const errors = await openApp(page);
  expect(await page.evaluate(() => S.cfg.uiSounds)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { S.space = S.spaces[0].id; S.list = 'all'; S.stage = 'week'; render(); });
  await page.evaluate(() => { window.__sfxLog = []; });
  await page.locator('#list .row .check').first().click();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => __sfxLog)).toContain('done');
  expect(await page.evaluate(() => S.cfg.sfxStyle)).toBe('glass');
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await expect(page.locator('[data-tg="uiSounds"], [data-page="sounds"]')).toHaveCount(0);
  noErrors(errors);
});

test('sounds: one finish sound per tick, steps in focus', async ({ page }) => {
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
    await page.locator(look === 'tide' ? '#tSteps [data-fst]' : '#fSteps [data-fst]').first().click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => __sfxLog)).toContain('tick');
    await page.evaluate(look => { try { look === 'tide' ? tideLeave() : closeFocus(); } catch (e) {} }, look);
    await page.waitForTimeout(300);
  }
  noErrors(errors);
});
