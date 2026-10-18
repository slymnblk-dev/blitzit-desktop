// Settings → Data: typed confirmation for Delete all / Reset; demo only when Windaday is empty.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';
const toData = page => page.evaluate(() => { openSettings(); setView = 'data'; drawSettings(); });

test('delete all tasks needs DELETE typed; demo only appears when empty and adds 2 spaces, 2 lists, 18 tasks', async ({ page }) => {
  const errors = await openApp(page);
  await toData(page);
  await expect(page.locator('#demo')).toHaveCount(0);                    // has tasks: no demo button
  await page.locator('#wipe').click();
  await page.locator('#dzIn').fill('DELET');
  await expect(page.locator('#dzGo')).toBeDisabled();
  await page.locator('#dzIn').fill('DELETE');
  await page.locator('#dzGo').click();
  expect(await page.evaluate(() => S.tasks.length)).toBe(0);
  await page.locator('#demo').click();
  const r = await page.evaluate(() => ({ sp: S.spaces.map(s => s.name), ls: S.lists.map(l => l.name), n: S.tasks.length,
    per: S.lists.map(l => ['backlog', 'week', 'today'].map(st => S.tasks.filter(t => t.list === l.id && t.stage === st).length)) }));
  expect(r.sp).toEqual(['Work', 'Personal']);
  expect(r.ls).toEqual(['Projects', 'Life']);
  expect(r.n).toBe(18);
  expect(r.per).toEqual([[3, 3, 3], [3, 3, 3]]);
  await expect(page.locator('#demo')).toHaveCount(0);                    // gone once there is data
  expect(await page.evaluate(() => { loadDemo(); return S.tasks.length })).toBe(18); // and it can't add more
  noErrors(errors);
});

test('reset needs RESET typed and gives a fresh start (tasks, spaces, lists, settings)', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.priStyle = 'ring'; S.cfg.lightTheme = 'sand'; save(); });
  await toData(page);
  await page.locator('#resetAll').click();
  await page.locator('#dzIn').fill('DELETE');
  await expect(page.locator('#dzGo')).toBeDisabled();
  await page.locator('#dzIn').fill('reset');
  await page.locator('#dzGo').click();
  const r = await page.evaluate(() => ({ n: S.tasks.length, sp: S.spaces.length, ls: S.lists.length, pri: S.cfg.priStyle, lt: S.cfg.lightTheme, onb: S.onboarded }));
  expect(r).toEqual({ n: 0, sp: 1, ls: 1, pri: 'bars', lt: 'default', onb: false });
  noErrors(errors);
});

test('onboarding "Explore with demo data" loads the Work + Personal demo, also after a reset', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.tasks = []; S.spaces = [S.spaces[0]]; S.lists = [S.lists[0]]; save(); openIntro(false); inStep = 2; drawIntro(); });
  await page.locator('#inDemo').click();
  const r = await page.evaluate(() => ({ sp: S.spaces.map(s => s.name), n: S.tasks.length, onb: S.onboarded }));
  expect(r).toEqual({ sp: ['Work', 'Personal'], n: 18, onb: true });
  noErrors(errors);
});
