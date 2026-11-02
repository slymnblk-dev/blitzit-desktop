// Welcome animation: on by default, once a day, skippable, can be turned off, Play button replays it.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('welcome: always on, plays once a day, skips on click', async ({ page }) => {
  await page.addInitScript(() => { window.__wlTest = true; });
  const errors = await openApp(page);
  expect(await page.evaluate(() => S.cfg.welcome)).toBe(true);
  const w = page.locator('#welcome');
  await expect(w).toBeVisible();
  await expect(w.locator('.wl-tag b')).toHaveText('Win the day.');
  await w.click();
  await expect(w).toHaveCount(0);
  // second open on the same day: no welcome
  await page.reload();
  await page.waitForTimeout(600);
  await expect(page.locator('#welcome')).toHaveCount(0);
  // always on: no switch and no Play button in Settings any more (0.270)
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await expect(page.locator('#wlPlay, [data-tg="welcome"]')).toHaveCount(0);
  noErrors(errors);
});
