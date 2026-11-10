// Phones: page changes move as one (View Transitions, 0.282). Tests turn it on with window.__vtTest.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test.use({ viewport: { width: 390, height: 844 } });

test('with page motion on, every page change lands on the right page and the motion ends cleanly', async ({ page }) => {
  await page.addInitScript(() => { window.__vtTest = true; });
  const errors = await openApp(page);
  await page.evaluate(() => { S.lists.push({ id: 'lgro', name: 'Groceries', c: '#F5A35A', space: '', loose: true }); save(); goHome(); });
  const settle = () => page.waitForFunction(() => !document.documentElement.dataset.vt && !vtIn);
  // Home → a space (slides in from the right)
  const sp = await page.evaluate(() => S.spaces[0].id);
  await page.locator(`.sp-row[data-space="${sp}"]`).click();
  await settle();
  expect(await page.evaluate(() => [S.space, document.documentElement.dataset.view])).toEqual([sp, 'space']);
  // the title moves once, with the page: nothing replays after the slide (0.283)
  const moving = () => page.evaluate(() => document.getAnimations().filter(x => x.playState === 'running' && x.effect && x.effect.target && x.effect.target.closest && x.effect.target.closest('.hero,.home-hero')).length);
  expect(await moving()).toBe(0);
  await page.waitForTimeout(300);
  expect(await moving()).toBe(0);
  // stage change: instant since 0.317 (no page slide, no title slide)
  await page.evaluate(() => go('week'));
  expect(await page.evaluate(() => [document.documentElement.dataset.vt || null, vtIn])).toEqual([null, false]);
  expect(await moving()).toBe(0);
  await settle();
  await expect(page.locator('#listName, .hero h1').first()).toBeVisible();
  expect(await page.evaluate(() => S.stage)).toBe('week');
  // a list without a space: opening it sets the space and the list together, even though drawing waits a frame
  await page.evaluate(() => goHome());
  await settle();
  await page.waitForTimeout(300);
  expect(await moving()).toBe(0);                                                // Home's title doesn't pop in again
  await page.locator('.lo-row[data-loose="lgro"]').click();
  await settle();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual(['all', 'lgro']);
  await expect(page.locator('#listName')).toHaveText('Groceries');
  // tabs
  await page.evaluate(() => goHome());
  await settle();
  await page.evaluate(() => tbGo('inbox'));
  await settle();
  expect(await page.evaluate(() => ibOn)).toBe(true);
  await page.evaluate(() => tbGo('home'));
  await settle();
  expect(await page.evaluate(() => [ibOn, S.space])).toEqual([false, null]);
  noErrors(errors);
});

test('page motion stays off on computers and with Motion off', async ({ page }) => {
  await page.addInitScript(() => { window.__vtTest = true; });
  const errors = await openApp(page);
  await page.evaluate(() => { root.dataset.motion = 'off'; });
  expect(await page.evaluate(() => vtOn())).toBe(false);
  await page.evaluate(() => { root.dataset.motion = ''; });
  await page.setViewportSize({ width: 1400, height: 900 });
  expect(await page.evaluate(() => vtOn())).toBe(false);
  noErrors(errors);
});
