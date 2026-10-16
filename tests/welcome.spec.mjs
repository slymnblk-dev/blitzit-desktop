// Welcome animation: on by default, once a day, skippable, can be turned off, Play button replays it.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('welcome: plays once a day, skips on click, off switch works, Play replays', async ({ page }) => {
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
  // Play button in Settings → Appearance
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('#wlPlay').click();
  await expect(page.locator('#welcome')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcome')).toHaveCount(0);
  // turned off: no welcome on a new day
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('[data-tg="welcome"]').click();
  await expect.poll(() => page.evaluate(() => S.cfg.welcome)).toBe(false);
  await page.evaluate(() => { localStorage.removeItem('welcomeDay'); closeSettings(); maybeWelcome(); });
  await expect(page.locator('#welcome')).toHaveCount(0);
  noErrors(errors);
});
