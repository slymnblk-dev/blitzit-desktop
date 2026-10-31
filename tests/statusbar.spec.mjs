// Full-screen moments own the whole screen: the reminder card stays out of sight until it shows,
// and the phone's status bar takes Focus's colour while Focus is open.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('reminder card is hidden when closed; status bar matches Focus, then goes back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  const errors = await openApp(page);
  await expect(page.locator('#remCard')).toBeHidden();
  const meta = () => page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  const base = await meta();
  await page.evaluate(() => startBlitz([S.tasks.find(t => t.stage === 'today')]));
  await expect.poll(meta).toBe(await page.evaluate(() => getComputedStyle($('focus')).backgroundColor));
  await page.keyboard.press('Escape');
  await expect.poll(meta).toBe(base);
  noErrors(errors);
});
