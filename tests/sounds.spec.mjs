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
