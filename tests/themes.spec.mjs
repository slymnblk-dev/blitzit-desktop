// Themes: Sand/Porcelain for light, Onyx/Ember for dark; hover previews, click picks, leaving restores.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('themes: pick Sand, hovering changes nothing, Ember for dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const errors = await openApp(page);
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(244, 244, 240)');
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('.thc[data-thid="sand"]').click();
  await expect.poll(bg).toBe('rgb(241, 235, 225)');
  expect(await page.evaluate(() => S.cfg.lightTheme)).toBe('sand');
  await page.locator('.thc[data-thid="onyx"]').hover();                    // hovering no longer changes the app
  await page.waitForTimeout(300);
  expect(await bg()).toBe('rgb(241, 235, 225)');
  await page.locator('.thc[data-thid="ember"]').click();
  expect(await page.evaluate(() => S.cfg.darkTheme)).toBe('ember');
  await page.evaluate(() => setCfg('theme', 'dark'));
  await expect.poll(bg).toBe('rgb(20, 17, 15)');
  noErrors(errors);
});
