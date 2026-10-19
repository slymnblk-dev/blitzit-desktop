// Core app: loads cleanly everywhere, tasks can be added, finished, undone and survive a reload.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

for (const [name, viewport] of [['desktop', { width: 1400, height: 860 }], ['phone', { width: 390, height: 760 }], ['phone landscape', { width: 844, height: 390 }]]) {
  test(`loads without errors on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = await openApp(page);
    await expect(page).toHaveTitle('Windaday');
    await page.evaluate(() => { render(); });
    noErrors(errors);
  });
}

test('first launch shows the welcome screens and can be finished', async ({ page }) => {
  const errors = await openApp(page, { skipIntro: false });
  await expect(page.locator('#intro')).toHaveClass(/on/);
  await page.locator('#inSkip').click();          // jumps to the last step
  await page.locator('#inDemo').click();          // "Explore with demo data" finishes it
  await expect(page.locator('#intro')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => S.onboarded)).toBe(true);
  noErrors(errors);
});

test('add a task, finish it, undo, and it all survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => openSpaceSide(S.spaces[0].id));
  const n0 = await page.evaluate(() => S.tasks.length);
  await page.locator('.col[data-s="today"] .ca-btn').click();
  await page.locator('.col[data-s="today"] .ca-in').fill('Write the test plan');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.tasks.length)).toBe(n0 + 1);
  const id = await page.evaluate(() => S.tasks.find(t => t.title === 'Write the test plan').id);
  await page.locator(`.col[data-s="today"] .row[data-id="${id}"] [data-check]`).click();
  await expect.poll(() => page.evaluate(i => S.tasks.find(t => t.id === i).stage, id)).toBe('done');
  await page.locator('#undoBtn').click();
  await expect.poll(() => page.evaluate(i => S.tasks.find(t => t.id === i).stage, id)).toBe('today');
  await page.reload();
  await page.waitForFunction(() => { try { return typeof S === 'object'; } catch { return false; } });
  expect(await page.evaluate(i => S.tasks.find(t => t.id === i)?.stage, id)).toBe('today');
  noErrors(errors);
});

test('profile: name, emoji avatar and goal are saved', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.locator('#dMe').click();
  await page.locator('#youName').fill('Suly');
  await expect(page.locator('[data-av="🦊"]')).toHaveCount(0);                     // avatars tucked away
  await page.locator('#avToggle').click();
  await page.locator('[data-av="🦊"]').click();
  await page.locator('[data-goal="120"]').click();
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => { try { return typeof S === 'object'; } catch { return false; } });
  expect(await page.evaluate(() => [S.cfg.name, S.cfg.avatar, S.cfg.goalMin])).toEqual(['Suly', '🦊', 120]);
  noErrors(errors);
});

test('the Today column has a Win the day button that starts a session', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => openSpaceSide(S.spaces[0].id));
  await expect(page.locator('#colGo')).toBeVisible();
  await expect(page.locator('#colGo')).toContainText('Win the day');
  await page.locator('#colGo').click();
  await expect.poll(() => page.evaluate(() => F.on)).toBe(true);
  noErrors(errors);
});

test('Download tab: web app, Windows app and Mac (coming soon); no stray install icons', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await expect(page.locator('#dInstall, #installBtn')).toHaveCount(0);
  await page.evaluate(() => openYou('download'));
  const cards = page.locator('.dl-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Web app');
  await expect(cards.nth(1)).toContainText('Windows app');
  await expect(page.locator('#dlWin')).toBeVisible();
  await expect(cards.nth(2)).toContainText('Coming soon');
  // when the browser offers installing, the web card gets an Install button
  await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = true }; e.userChoice = Promise.resolve({}); window.dispatchEvent(e); });
  await page.locator('#dlWeb').click();
  expect(await page.evaluate(() => window.__prompted)).toBe(true);
  noErrors(errors);
});

test('account tab: a clear card says whether tasks are backed up', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => openYou('profile'));
  await expect(page.locator('#setIn .safe-card')).toHaveCount(0);                 // Profile is just you: name, avatar, goal
  await page.locator('[data-yt="account"]').click();
  expect(await page.evaluate(() => youTab)).toBe('account');
  await expect(page.locator('#accSec')).toBeAttached();
  if (await page.evaluate(() => typeof CLOUD !== 'undefined' && !!CLOUD)) {
    await expect(page.locator('#setIn .auth-warn')).toContainText('only on this device');   // one quiet line, no big card
    await expect(page.locator('#setIn .safe-card')).toHaveCount(0);
    await expect(page.locator('[data-yt="account"] .yt-dot')).toBeVisible();
  }
  noErrors(errors);
});
