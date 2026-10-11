// Task details: step names can be edited; focus view opens the task big in the middle.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('click a step name to rename it; only the circle ticks it', async ({ page }) => {
  const errors = await openApp(page);
  const id = await page.evaluate(() => { const t = S.tasks.find(x => !x.archived); t.subs = [{ id: 1, t: 'eleven', done: false }]; openDetail(t.id); return t.id; });
  const name = page.locator('#dSubs .s-t').first();
  await name.click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).subs[0].done, id)).toBe(false);   // clicking text doesn't tick
  await name.fill('ten');
  await name.press('Enter');
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).subs[0].t, id)).toBe('ten');
  await name.click(); await name.fill('oops'); await name.press('Escape');                      // Esc undoes the edit
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).subs[0].t, id)).toBe('ten');
  await page.locator('#dSubs .sc').first().click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).subs[0].done, id)).toBe(true);
  noErrors(errors);
});

test('focus view: task opens big in the middle and is remembered', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => openDetail(S.tasks.find(x => !x.archived).id));
  await page.locator('#dWide').click();
  await expect(page.locator('#detailSheet')).toHaveClass(/wide/);
  await page.waitForTimeout(400);
  const box = await page.locator('#detailSheet').boundingBox();
  expect(Math.abs(box.x + box.width / 2 - 700)).toBeLessThan(4);                                  // centred
  expect(box.width).toBeGreaterThan(900);
  await page.locator('#dClose').click();
  await page.evaluate(() => openDetail(S.tasks.find(x => !x.archived).id));
  await expect(page.locator('#detailSheet')).toHaveClass(/wide/);                                  // remembered
  noErrors(errors);
});

test('deleting a step asks first', async ({ page }) => {
  const errors = await openApp(page);
  const id = await page.evaluate(() => { const t = S.tasks.find(x => !x.archived); t.subs = [{ id: 1, t: 'one', done: false }, { id: 2, t: 'two', done: false }]; openDetail(t.id); return t.id; });
  await page.locator('#dSubs .sx').first().click();
  await expect(page.locator('#dlg')).toHaveClass(/on/);
  await page.locator('#dlgNo').click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).subs.length, id)).toBe(2);
  await page.locator('#dSubs .sx').first().click();
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).subs.map(s => s.t), id)).toEqual(['two']);
  noErrors(errors);
});
