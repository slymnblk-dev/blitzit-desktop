// Data safety: damaged saved data never stops the app, and a bad backup changes nothing.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const broken = [
  '{"tasks":[null,{"id":1,"title":"ok","stage":"today"}]}',
  '{"tasks":{},"lists":{}}',
  '{"tasks":[{"id":2,"title":"x","subs":"x"}],"lists":[null]}',
  '{"tasks":[{"id":3,"title":"y","subs":[null]}],"spaces":[null]}',
  '{"tasks":[{"id":4,"stage":"weird","list":"nope","est":"lots"}],"cfg":"broken"}',
  'not json at all',
];

for (const [i, data] of broken.entries()) {
  test(`damaged saved data #${i + 1} still opens the app`, async ({ page }) => {
    const errors = await openApp(page, { storage: data });
    await page.evaluate(() => render());
    noErrors(errors);
  });
}

test('a broken backup is rejected and nothing changes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  const before = await page.evaluate(() => JSON.stringify(S.tasks));
  await page.evaluate(() => { openSettings(); setView = 'data'; drawSettings(); });
  await page.locator('#bkOpen').click();
  await page.locator('#bkTxt').fill('{"tasks":[null],"lists":"nope"}');
  await page.locator('#bkGo').click();
  expect(await page.evaluate(() => JSON.stringify(S.tasks))).toBe(before);
  noErrors(errors);
});
