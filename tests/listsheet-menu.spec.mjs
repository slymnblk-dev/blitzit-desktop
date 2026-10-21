// The Lists sheet header uses one ⋯ menu (Edit lists / Edit space); there are 10 list colours.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('lists sheet: ⋯ menu opens edit mode, Done closes it; 10 colours', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => PALETTE.length)).toBe(10);
  await page.evaluate(() => { editing = false; nl = null; drawLists(); openSheet('listSheet'); });
  await expect(page.locator('#editLists')).toBeHidden();
  await page.locator('#listsMore').click();
  await expect(page.locator('#listsPop')).toBeVisible();
  await page.locator('#lmEdit').click();
  expect(await page.evaluate(() => editing)).toBe(true);
  await expect(page.locator('#listsMore')).toBeHidden();
  await expect(page.locator('#editLists')).toHaveText('Done');
  await page.locator('#editLists').click();
  expect(await page.evaluate(() => editing)).toBe(false);
  await expect(page.locator('#listsMore')).toBeVisible();
  await page.locator('#listsMore').click();
  await page.locator('#listTitle, #listsTitle').first().click();
  await expect(page.locator('#listsPop')).toBeHidden();
  noErrors(errors);
});

test('list editor folds smoothly: one section at a time, colour/space change, space sheet folds too', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => { const l = S.lists[0]; editing = true; nl = null; leOpen = null; drawLists(); openSheet('listSheet'); return l.id; });
  await page.locator(`.le-row[data-le="${id}"]`).click();
  await expect(page.locator('#picks .le-coll')).toHaveCount(1);
  await page.locator('#picks [data-lxt="c"]').click();
  await expect(page.locator('#picks .lx[data-lx="c"]')).toHaveClass(/on/);
  await page.locator('#picks [data-lxt="t"]').click();
  await expect(page.locator('#picks .lx[data-lx="c"]')).not.toHaveClass(/on/);
  await page.locator('#picks [data-lxt="c"]').click();
  const c = await page.evaluate(() => PALETTE[8]);
  await page.locator(`#picks [data-lc="${c}"]`).click();
  expect(await page.evaluate(i => S.lists.find(l => l.id === i).c, id)).toBe(c);
  await expect(page.locator('#picks .lx[data-lx="c"]')).toHaveClass(/on/); // stays open after picking
  await page.locator(`.le-row[data-le="${id}"]`).click();
  await expect(page.locator('#picks .le-coll')).toHaveCount(0);
  await page.evaluate(() => { closeSheets(); openSpaceSheet(S.spaces[0].id); });
  await page.waitForTimeout(350);
  await page.locator('#spOpts [data-lxt="i"]').click();
  await page.locator('#spIcons [data-ico="🚀"]').click();
  await page.locator('#spPin').click();
  await page.locator('#spSave').click();
  expect(await page.evaluate(() => [S.spaces[0].e, S.spaces[0].pinned])).toEqual(['🚀', true]);
  noErrors(errors);
});
