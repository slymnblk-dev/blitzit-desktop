// Archive: tasks, lists and spaces can be archived (restorable) or deleted for good.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const openArchive = async (page, tab) => page.evaluate(tab => { openSettings && openSettings(); arcFrom = 'data'; arcTab = tab; setView = 'archive'; drawSettings(); }, tab);

test('archive a task from its menu, find it under Archived → Tasks, restore it', async ({ page }) => {
  const errors = await openApp(page);
  const id = await page.evaluate(() => { const t = S.tasks.find(x => !x.archived && x.stage !== 'done'); openDetail(t.id); return t.id; });
  await page.locator('#dMore').click();
  await page.locator('#dArc').click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).archived, id)).toBe(true);
  await expect(page.locator(`.row[data-id="${id}"]`)).toHaveCount(0);           // hidden from the board
  await openArchive(page, 'tasks');
  await expect(page.locator(`.arc-row[data-k="t${id}"]`)).toBeVisible();
  await page.locator(`.arc-row[data-k="t${id}"] [data-arest]`).click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).archived, id)).toBe(false);
  noErrors(errors);
});

test('archive a list with its tasks, then restore everything', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const sp = S.spaces.find(s => S.lists.filter(l => l.space === s.id).length > 1) || S.spaces[0];
    if (S.lists.filter(l => l.space === sp.id).length < 2) S.lists.push({ id: 'lx', name: 'Extra', c: '#888', space: sp.id });
    const l = S.lists.find(x => x.space === sp.id);
    const n = S.tasks.filter(t => t.list === l.id).length;
    S.space = sp.id; editing = true; leOpen = l.id; drawLists(); openSheet('listSheet');
    return { id: l.id, n, total: S.tasks.length };
  });
  await page.locator(`[data-larc="${r.id}"]`).click();
  const mid = await page.evaluate(id => ({ list: S.lists.some(l => l.id === id), arch: S.arch.find(b => b.id === 'al' + id), total: S.tasks.length }), r.id);
  expect(mid.list).toBe(false);
  expect(mid.arch.tasks.length).toBe(r.n);
  expect(mid.total).toBe(r.total - r.n);
  await page.evaluate(() => closeSheets());
  await openArchive(page, 'lists');
  await page.locator(`.arc-row[data-k="al${r.id}"] [data-arest]`).click();
  const end = await page.evaluate(id => ({ list: S.lists.some(l => l.id === id), arch: S.arch.length, total: S.tasks.length }), r.id);
  expect(end).toEqual({ list: true, arch: 0, total: r.total });
  noErrors(errors);
});

test('archive a space, delete it for good from Archived (asks first)', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    if (S.spaces.length < 2) { S.spaces.push({ id: 'sx', name: 'Side', c: '#888', e: '' }); S.lists.push({ id: 'lsx', name: 'General', c: '#888', space: 'sx' }); }
    const sp = S.spaces[S.spaces.length - 1]; askArchiveSpace(sp.id); return sp.id;
  });
  expect(await page.evaluate(id => S.spaces.some(s => s.id === id), r)).toBe(false);
  await openArchive(page, 'spaces');
  await page.locator(`.arc-row[data-k="as${r}"] [data-akill]`).click();
  await expect(page.locator('#dlg')).toHaveClass(/on/);
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(() => S.arch.length)).toBe(0);
  noErrors(errors);
});

test('archived lists sync between devices and a restore beats the old removal', async ({ page }) => {
  const errors = await openApp(page);
  const ok = await page.evaluate(() => {
    const now = Date.now(), L = { tasks: [], lists: [], spaces: [], arch: [{ id: 'al1', kind: 'list', at: now, u: now, list: { id: 'l1', name: 'A' }, tasks: [] }], tomb: { 'l:l1': now } };
    const R = { tasks: [], lists: [{ id: 'l2', name: 'B', u: now }], spaces: [], arch: [], tomb: {} };
    const m = mergeDocs(L, R);
    const back = mergeDocs({ ...m, arch: [], lists: [...m.lists, { id: 'l1', name: 'A', u: now + 5 }], tomb: { ...m.tomb, 'a:al1': now + 5 } }, m);
    return m.arch.length === 1 && m.lists.length === 1 && back.arch.length === 0 && back.lists.some(l => l.id === 'l1');
  });
  expect(ok).toBe(true);
  noErrors(errors);
});

test('Settings → Lists: a page with a back button, lists grouped by space, editing works, sheet still works after', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { openSettings(); setView = 'main'; drawSettings(); });
  await page.locator('#setIn [data-page="lists"]').click();
  await expect(page.locator('#listSheet')).not.toHaveClass(/on/);                    // no extra panel on top
  await expect(page.locator('#setIn #subBack')).toBeVisible();
  const groups = await page.evaluate(() => S.spaces.length);
  await expect(page.locator('#setIn .lg')).toHaveCount(groups);
  const l = await page.evaluate(() => S.lists[0].id);
  await page.locator(`#setIn [data-le="${l}"]`).click();
  await page.locator(`#setIn [data-ren="${l}"]`).fill('Renamed list');
  expect(await page.evaluate(l => S.lists.find(x => x.id === l).name, l)).toBe('Renamed list');
  const sp = await page.evaluate(() => S.spaces[0].id);
  await page.locator(`#setIn [data-nlsp="${sp}"]`).click();
  await page.keyboard.type('Brand new');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(sp => S.lists.some(x => x.name === 'Brand new' && x.space === sp), sp)).toBe(true);
  await page.locator('#subBack').click();
  await page.evaluate(() => closeSettings());
  await page.evaluate(() => { editing = false; nl = null; drawLists(); openSheet('listSheet'); });
  await expect(page.locator('#listSheet #picks .pick').first()).toBeVisible();          // the list sheet still has its picks
  noErrors(errors);
});
