// Phone tab bar: Home and up to 3 more. Pick them in Settings → Appearance → Tabs; the rest open from Modes on Home.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('at most Home + 3 tabs; pick in Settings; hidden modes open from Modes on Home with a Back button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  // inbox is on by default; turning modes on fills the bar up to three, then stops
  for (const k of ['habits', 'goals', 'wins', 'routines']) await page.evaluate(k => setCfg(k, true), k);
  await page.evaluate(() => { closeSettings && closeSettings(); goHome(); });
  await expect(page.locator('#tabBar .tb')).toHaveCount(4);
  expect(await page.evaluate(() => tabsList().map(t => t[0]))).toEqual(['home', 'inbox', 'habits', 'goals']);
  // Modes on Home lists the ones without a tab
  await expect(page.locator('#modesBtn')).toBeVisible();
  await page.locator('#modesBtn').click();
  await expect(page.locator('#modesPop [data-mdgo]')).toHaveText(['Wins', 'Routines', 'Choose tabs']);
  await page.locator('#modesPop [data-mdgo="wins"]').click();
  await expect(page.locator('#winsPg')).toHaveClass(/on/);
  await expect(page.locator('#winsPg .ib-top')).toBeVisible();
  await page.locator('#winsPg #wnBack').click();
  await expect(page.locator('#winsPg')).not.toHaveClass(/on/);
  // Settings → Appearance → Tabs: a fourth is refused, swap one instead
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await expect(page.locator('#setIn .tbp')).toHaveCount(5);
  await page.locator('#setIn [data-tbp="routines"]').click();
  await expect(page.locator('#toast')).toContainText('Up to 3 tabs');
  await page.locator('#setIn [data-tbp="inbox"]').click();
  await page.locator('#setIn [data-tbp="routines"]').click();
  await expect(page.locator('#setIn [data-tbp="routines"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => tabsList().map(t => t[0]))).toEqual(['home', 'habits', 'goals', 'routines']);
  // the bar always keeps its natural order; Inbox now opens from Modes
  await page.evaluate(() => { closeSettings(); goHome(); });
  await page.locator('#modesBtn').click();
  await expect(page.locator('#modesPop [data-mdgo]')).toHaveText(['Inbox', 'Wins', 'Choose tabs']);
  await page.keyboard.press('Escape');
  // no modes hidden: no Modes button
  await page.evaluate(() => { setCfg('wins', false); setCfg('inbox', false); closeSettings(); goHome(); });
  await expect(page.locator('#modesBtn')).toBeHidden();
  noErrors(errors);
});
