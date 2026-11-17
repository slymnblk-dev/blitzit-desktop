// 0.328: adding tasks back to back never drops one; a real double tap on Save still adds only one task.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const open = page => page.evaluate(() => { goHome(); document.getElementById('addBtn').click(); });
const count = (page, t) => page.evaluate(t => S.tasks.filter(x => x.title === t).length, t);

test('two tasks added right after each other both land', async ({ page }) => {
  const errors = await openApp(page);
  await open(page); await page.locator('#newTitle').fill('First'); await page.locator('#saveBtn').click();
  await open(page); await page.locator('#newTitle').fill('Second'); await page.locator('#saveBtn').click();   // well inside 700 ms
  await expect.poll(() => count(page, 'Second')).toBe(1);
  expect(await count(page, 'First')).toBe(1);
  noErrors(errors);
});

test('a double tap on Save still adds the task only once', async ({ page }) => {
  const errors = await openApp(page);
  await open(page); await page.locator('#newTitle').fill('Once');
  await page.evaluate(() => { const b = document.getElementById('saveBtn'); b.click(); b.click(); });
  await expect.poll(() => count(page, 'Once')).toBe(1);
  await page.waitForTimeout(300);
  expect(await count(page, 'Once')).toBe(1);
  noErrors(errors);
});
