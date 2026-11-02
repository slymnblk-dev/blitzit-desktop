// Quiet when idle (computers): summary + add buttons fade after 5s still; any move brings them back.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('quiet when idle: always on, hides after 5s (not 3), mouse move brings it back', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => openSpaceSide(S.spaces[0].id));
  await page.mouse.move(600, 600);
  expect(await page.evaluate(() => S.cfg.idleHide)).toBe(true);
  await expect(page.locator('body')).not.toHaveClass(/idle/);
  await page.waitForTimeout(3600);
  await expect(page.locator('body')).not.toHaveClass(/idle/);                  // still there after 3s
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toHaveClass(/idle/);
  await page.mouse.move(640, 620);
  await expect(page.locator('body')).not.toHaveClass(/idle/);
  noErrors(errors);
});

test('quiet when idle also fades the summary in Full width mode', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.fullWidth = true; applySettings(); openSpaceSide(S.spaces[0].id); });
  await page.mouse.move(600, 600);
  const op = () => page.locator('.fw-sub').evaluate(e => +getComputedStyle(e).opacity);
  await page.waitForTimeout(2500);
  expect(await op()).toBeGreaterThan(.9);
  await page.waitForTimeout(5000);
  expect(await op()).toBeLessThan(.05);
  await page.mouse.move(650, 640);
  await page.waitForTimeout(700);
  expect(await op()).toBeGreaterThan(.9);
  noErrors(errors);
});
