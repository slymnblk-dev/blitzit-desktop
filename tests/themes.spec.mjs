// Themes: Sand/Porcelain for light, Onyx/Ember for dark; hover previews, click picks, leaving restores.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('themes: pick Sand, hovering changes nothing, Ember for dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.theme = 'system'; S.cfg.lightTheme = 'default'; S.cfg.darkTheme = 'default'; save(); applySettings(); }); // start from the plain looks
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(244, 244, 240)');
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('.thp[data-thid="sand"]').click();
  await expect.poll(bg).toBe('rgb(241, 235, 225)');
  expect(await page.evaluate(() => S.cfg.lightTheme)).toBe('sand');
  await page.locator('.thp[data-thid="onyx"]').hover();                    // hovering no longer changes the app
  await page.waitForTimeout(300);
  expect(await bg()).toBe('rgb(241, 235, 225)');
  await page.locator('.thp[data-thid="ember"]').click();
  expect(await page.evaluate(() => S.cfg.darkTheme)).toBe('ember');
  await page.evaluate(() => setCfg('theme', 'dark'));
  await expect.poll(bg).toBe('rgb(20, 17, 15)');
  noErrors(errors);
});

test('starts dark (Ember); the sun/moon button switches to light (Sand) and it is remembered', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.emulateMedia({ colorScheme: 'light' }); // even when the device is light
  const errors = await openApp(page);
  expect(await page.evaluate(() => [C().theme, C().darkTheme, C().lightTheme, C().homeLayout, modeNow()])).toEqual(['dark', 'ember', 'sand', 'calm', 'dark']);
  await page.locator('[data-tt]:visible').click();
  await expect.poll(() => page.evaluate(() => modeNow())).toBe('light');
  await page.reload();
  await page.waitForFunction(() => { try { return typeof S === 'object'; } catch { return false; } });
  expect(await page.evaluate(() => [C().theme, modeNow(), document.querySelector('[data-tt]:not([hidden])').getAttribute('aria-label')])).toEqual(['light', 'light', 'Switch to dark mode']);
  noErrors(errors);
});
