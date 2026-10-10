// Focus sessions: Classic and Tide, time's up, finishing, and coming back after a reload.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const ready = page => page.waitForFunction(() => { try { return typeof S === 'object' && typeof F === 'object'; } catch { return false; } });

test('Classic: finish every task and reach the "Day won" screen', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.focusStyle = 'classic'; S.cfg.focusMode = 'free'; save(); $('goBtn').click(); });
  const total = await page.evaluate(() => F.q.length);
  for (let i = 0; i < total; i++) { await page.evaluate(() => { F.tapAt = 0; $('fDone').click(); }); await page.waitForTimeout(150); }
  await expect(page.locator('#focus')).toHaveClass(/sum/);
  await expect(page.locator('.f-sum h3')).toHaveText('Day won');
  noErrors(errors);
});

test('Classic: a running session comes back after a reload', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.focusStyle = 'classic'; S.cfg.focusMode = 'free'; save(); $('goBtn').click(); });
  await page.evaluate(() => { F.sec = 300; F.last = Date.now(); save(); });
  const title = await page.evaluate(() => F.q[F.i].title);
  await page.reload(); await ready(page);
  await expect.poll(() => page.evaluate(() => F.on && !F.tide)).toBe(true);
  expect(await page.evaluate(() => F.q[F.i].title)).toBe(title);
  expect(await page.evaluate(() => F.sec)).toBeGreaterThanOrEqual(300);
  // closing the session forgets it
  await page.evaluate(() => closeFocus());
  await page.reload(); await ready(page); await page.waitForTimeout(500);
  expect(await page.evaluate(() => F.on)).toBeFalsy();
  noErrors(errors);
});

test('Tide: time is up, +5 minutes, then done', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.focusStyle = 'tide'; save(); $('goBtn').click(); });
  await page.locator('#tide [data-a="go"]').click();
  await page.evaluate(() => { T.st = Date.now() - T.dur - 1000; tideTick(); });
  await expect.poll(() => page.evaluate(() => T.mode)).toBe('end');
  await page.locator('#tide [data-a="more"]').click();
  expect(await page.evaluate(() => T.mode)).toBe('run');
  const before = await page.evaluate(() => F.done);
  await page.locator('#tide [data-a="done"]').click();
  await expect.poll(() => page.evaluate(() => F.done)).toBe(before + 1);
  noErrors(errors);
});

test('Tide: a running session comes back after a reload', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.focusStyle = 'tide'; save(); $('goBtn').click(); });
  await page.locator('#tide [data-a="go"]').click();
  await page.waitForTimeout(300);
  await page.reload(); await ready(page);
  await expect.poll(() => page.evaluate(() => typeof tideOn === 'function' && tideOn())).toBe(true);
  noErrors(errors);
});
