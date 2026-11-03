// "+ New" (Task, Note, List, Space) and lists without a space (0.275).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const desk = page => page.setViewportSize({ width: 1400, height: 900 });

test('computer: the floating + opens Task, Note, List, Space; L makes a list with no space', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.inbox = true; save(); applySettings(); goHome(); });
  const fab = page.locator('#nwFab');
  await expect(fab).toBeVisible();
  await fab.click();
  await expect(page.locator('#nwMenu.on')).toBeVisible();
  const kinds = await page.locator('#nwMenu [data-nwk]').evaluateAll(b => b.map(x => x.dataset.nwk));
  expect(kinds).toEqual(expect.arrayContaining(['task', 'note', 'list', 'space']));
  await page.keyboard.press('l');
  await expect(page.locator('#addSheet.on.nw-fab-on')).toBeVisible();
  await expect(page.locator('#addSheet')).toHaveAttribute('data-kind', 'list');
  await page.locator('#newTitle').fill('Groceries');
  await page.locator('#newTitle').press('Enter');
  const r = await page.evaluate(() => { const l = S.lists.find(x => x.name === 'Groceries'); return { loose: l.loose, space: l.space, open: S.space === 'all' && S.list === l.id, title: document.getElementById('mDate').textContent }; });
  expect(r).toEqual({ loose: true, space: '', open: true, title: 'Groceries' });
  // the sidebar shows it under "Lists", above Spaces
  const row = page.locator('#sLists .s-loose', { hasText: 'Groceries' });
  await expect(row).toHaveClass(/on/);
  await expect(page.locator('#sAll')).not.toHaveClass(/\bon\b/);
  // a task added here lands in Groceries
  await page.evaluate(() => document.getElementById('addBtn').click());
  await page.locator('#newTitle').fill('Milk');
  await page.locator('#saveBtn').click();
  expect(await page.evaluate(() => listOf(S.tasks.find(t => t.title === 'Milk').list).name)).toBe('Groceries');
  // stays without a space after a reload
  await page.reload();
  await page.waitForFunction(() => typeof S === 'object');
  expect(await page.evaluate(() => { const l = S.lists.find(x => x.name === 'Groceries'); return [l.loose, l.space]; })).toEqual([true, '']);
  noErrors(errors);
});

test('Note is not offered when the Inbox is off', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.inbox = false; save(); applySettings(); goHome(); });
  await page.locator('#nwFab').click();
  const kinds = await page.locator('#nwMenu [data-nwk]').evaluateAll(b => b.map(x => x.dataset.nwk));
  expect(kinds).not.toContain('note');
  expect(kinds).toEqual(expect.arrayContaining(['task', 'list', 'space']));
  await page.keyboard.press('Escape');
  await expect(page.locator('#nwMenu.on')).toHaveCount(0);
  noErrors(errors);
});

test('a new space can bring in lists that have no space; tabs switch kinds', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await page.evaluate(() => { S.lists.push({ id: 'lgro', name: 'Groceries', c: '#F5A35A', space: '', loose: true }); save(); goHome(); });
  await page.locator('#nwFab').click();
  await page.locator('#nwMenu [data-nwk="task"]').click();
  await page.locator('#addKinds [data-ak="space"]').click();
  await page.locator('#newTitle').fill('Music');
  await page.locator('[data-nwbr="lgro"]').click();
  await page.locator('#saveBtn').click();
  const r = await page.evaluate(() => { const sp = S.spaces.find(x => x.name === 'Music'), l = S.lists.find(x => x.id === 'lgro');
    return { inIt: l.space === sp.id, loose: l.loose, general: S.lists.some(x => x.space === sp.id && x.name === 'General'), open: S.space === sp.id, icon: sp.e }; });
  expect(r).toEqual({ inIt: true, loose: false, general: false, open: true, icon: '🎧' });
  noErrors(errors);
});

test('lists can move out of a space and back (Edit lists)', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.lists.push({ id: 'lx2', name: 'Side', c: '#5AB8F5', space: S.spaces[0].id }); save(); });
  await page.evaluate(() => { goHome(); editing = true; nl = null; leOpen = 'lx2'; leSub = 's'; drawLists(); openSheet('listSheet'); });
  await page.locator('[data-ls=""]').click();
  expect(await page.evaluate(() => { const l = S.lists.find(x => x.id === 'lx2'); return [l.loose, l.space]; })).toEqual([true, '']);
  await page.locator(`[data-ls="${await page.evaluate(() => S.spaces[0].id)}"]`).click();
  expect(await page.evaluate(() => { const l = S.lists.find(x => x.id === 'lx2'); return [l.loose, l.space === S.spaces[0].id]; })).toEqual([false, true]);
  noErrors(errors);
});

test('phone: Home shows a Lists card; holding + opens the menu, a tap still adds a task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.lists.push({ id: 'lgro', name: 'Groceries', c: '#F5A35A', space: '', loose: true }); save(); goHome(); });
  const card = page.locator('.lo-row[data-loose="lgro"]');
  await expect(card).toBeVisible();
  await expect(page.locator('#nwFab')).toBeHidden();
  // hold the +
  const plus = page.locator('#tbAdd:visible, #addBtn:visible').first();
  const box = await plus.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  await expect(page.locator('#nwMenu.on')).toBeVisible();
  await expect(page.locator('#addSheet.on')).toHaveCount(0);
  await page.locator('#nwMenu [data-nwk="list"]').click();
  await expect(page.locator('#addSheet')).toHaveAttribute('data-kind', 'list');
  await page.evaluate(() => closeSheets());
  // a plain tap: the task card
  await page.waitForTimeout(400);
  await plus.click();
  await expect(page.locator('#addSheet.on')).toBeVisible();
  await expect(page.locator('#addSheet')).toHaveAttribute('data-kind', 'task');
  await page.evaluate(() => closeSheets());
  await page.waitForTimeout(400);
  await card.click();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual(['all', 'lgro']);
  await expect(page.locator('#listName')).toHaveText('Groceries');
  noErrors(errors);
});
