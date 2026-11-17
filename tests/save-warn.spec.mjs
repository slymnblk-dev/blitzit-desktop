// 0.322: a failed save (storage full / blocked) shows a clear warning once, never silently.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

test('failed save shows a warning once, then again only after a save worked', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  const breakStorage = on => page.evaluate(on => {
    if (on) { window.__realSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; }
    else Storage.prototype.setItem = window.__realSet;
  }, on);
  await breakStorage(true);
  await page.evaluate(() => save());
  await expect(page.locator('#toastMsg')).toContainText('Couldn’t save on this device');
  await expect(page.locator('#toast')).toHaveClass(/on/);
  // second failure in a row: no new toast
  await page.evaluate(() => { document.getElementById('toastMsg').textContent = 'x'; save(); });
  await expect(page.locator('#toastMsg')).toHaveText('x');
  // storage works again -> next failure warns again
  await breakStorage(false);
  await page.evaluate(() => save());
  await breakStorage(true);
  await page.evaluate(() => save());
  await expect(page.locator('#toastMsg')).toContainText('Couldn’t save');
  await breakStorage(false);
});

test('signed-in users get the "still syncing" wording', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.__u = { email: 'a@b.c' }; Storage.prototype.setItem = function () { throw new Error('blocked'); }; save(); });
  await expect(page.locator('#toastMsg')).toContainText('still syncing');
});
