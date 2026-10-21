// Desktop Home: "Spaces" (default) cards show stage bars and the next task;
// "Today first" (Settings → Appearance) lists today's tasks to tick off, spaces in a slim column.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('desktop home layouts: rich space cards by default, Today first from settings', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => C().homeLayout)).toBe('spaces');
  await expect(page.locator('#dHome .sp-next').first()).toBeVisible();
  await expect(page.locator('#dHome .ts-up')).toBeVisible();
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('#setIn [data-k="homeLayout"][data-v="today"]').click();
  await page.evaluate(() => closeSettings());
  const n = await page.locator('#dHome .hf-tk').count();
  expect(n).toBeGreaterThan(0);
  const id = await page.locator('#dHome .hf-tk').first().getAttribute('data-hft');
  await page.locator(`#dHome [data-hfdone="${id}"]`).click();
  await expect.poll(() => page.evaluate(i => S.tasks.find(t => String(t.id) === i).stage, id)).toBe('done');
  await expect(page.locator('#dHome .hf-tk')).toHaveCount(n - 1);
  await page.locator('#dHome .hf-sp').first().click();
  expect(await page.evaluate(() => !!S.space)).toBe(true);
  noErrors(errors);
});

test('today first: clicking a task opens its details', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.homeLayout = 'today'; render(); });
  await page.locator('#dHome .hf-tk .hf-t').first().click();
  await expect(page.locator('#detailSheet')).toHaveClass(/on/);
  noErrors(errors);
});
