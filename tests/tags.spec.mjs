// Deleting a task asks first; tags live in list settings and show on tasks.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('deleting a task asks Yes / No first', async ({ page }) => {
  const errors = await openApp(page);
  const t = await page.evaluate(() => { const t = S.tasks.find(x => !x.archived); openDetail(t.id); return { id: t.id, n: S.tasks.length }; });
  await page.locator('#dMore').click();
  await page.locator('#dDel').click();
  await expect(page.locator('#dlg')).toHaveClass(/on/);
  await expect(page.locator('#dlgIn')).toBeHidden();             // no typing needed
  await page.locator('#dlgNo').click();                          // No: nothing happens
  expect(await page.evaluate(id => S.tasks.some(x => x.id === id), t.id)).toBe(true);
  await page.locator('#dMore').click();
  await page.locator('#dDel').click();
  await page.locator('#dlgYes').click();                         // Yes: deleted
  expect(await page.evaluate(id => S.tasks.some(x => x.id === id), t.id)).toBe(false);
  await expect(page.locator('#detailSheet')).not.toHaveClass(/\bon\b/);
  noErrors(errors);
});

test('tags: add in a task, shown on the row, managed in list settings, survive a reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => { const t = S.tasks.find(x => !x.archived && x.stage === 'today'); S.list = t.list; S.space = listOf(t.list).space; render(); openDetail(t.id); return t.id; });
  await page.locator('.pill[data-p="tags"]').click();
  await page.locator('#dTagIn').fill('#Design');
  await page.locator('#dTagIn').press('Enter');
  await page.locator('#dTagIn').fill('urgent');
  await page.locator('#dTagIn').press('Enter');
  const st = await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); return { t: t.tags, l: listOf(t.list).tags }; }, id);
  expect(st.t).toEqual(['Design', 'urgent']);
  expect(st.l).toEqual(['Design', 'urgent']);
  await page.locator('.tg-pk', { hasText: '#urgent' }).click();          // toggle off
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).tags, id)).toEqual(['Design']);
  await page.locator('#dClose').click();
  await expect(page.locator(`#list .row[data-id="${id}"] .ttag`)).toHaveText('#Design');

  // list settings: rename and remove
  await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); editing = true; leOpen = t.list; leSub = 't'; drawLists(); openSheet('listSheet'); }, id);
  const tag = page.locator('.le-tg input').first();
  await tag.fill('Design work');
  await tag.press('Enter');
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).tags, id)).toEqual(['Design work']);
  await page.locator('.le-tg button').first().click();                 // used by a task: asks first
  await expect(page.locator('#dlg')).toHaveClass(/on/);
  await page.locator('#dlgYes').click();
  const after = await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); return { t: t.tags, l: listOf(t.list).tags }; }, id);
  expect(after.t).toEqual([]);
  expect(after.l).toEqual(['urgent']);

  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined');
  expect(await page.evaluate(id => listOf(S.tasks.find(x => x.id === id).list).tags, id)).toEqual(['urgent']);
  noErrors(errors);
});

test('moving a task to another list brings its tags along', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const t = S.tasks.find(x => !x.archived), other = S.lists.find(l => l.id !== t.list);
    listOf(t.list).tags = ['focus']; t.tags = ['focus']; openDetail(t.id);
    return { id: t.id, other: other.id };
  });
  await page.locator('.pill[data-p="list"]').click();
  await page.locator(`#dPicker .pk[data-v="${r.other}"]`).click();
  expect(await page.evaluate(o => S.lists.find(l => l.id === o).tags, r.other)).toEqual(['focus']);
  noErrors(errors);
});
