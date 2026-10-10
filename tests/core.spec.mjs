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
