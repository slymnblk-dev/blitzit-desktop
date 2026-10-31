// Impact: how much a task matters once it's done (Settings → Tasks: Off, Small · Medium · Big, or 1 to 5).
// The biggest impact goes to the top of every list on its own, leads Focus and Home, and shows up in Wins.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('pick Small · Medium · Big in task details; the list sorts itself, Big gets sparks, an edge and Quick win', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => {
    const sp = S.spaces[0]; openSpace(sp.id); S.stage = 'today'; render();
    const ts = visible().filter(t => t.stage === 'today'); const last = ts[ts.length - 1];
    last.est = 30; delete last.pri; openDetail(last.id); return last.id;
  });
  const pill = page.locator('#dPills .pill[data-p="imp"]');
  await expect(pill).toHaveText('Impact');
  await pill.click();
  await expect(page.locator('#dPicker .imp-c')).toHaveCount(3);
  await page.locator('#dPicker .imp-c', { hasText: 'Big' }).click();
  expect(await page.evaluate(id => S.tasks.find(t => t.id === id).imp, id)).toBe(5);
  await expect(pill).toContainText('Big impact');
  await page.keyboard.press('Escape');
  // it jumped to the top of Today, with three sparks, a violet edge and a Quick win tag (30 minutes)
  const first = page.locator('#list .row').first();
  await expect(first).toHaveAttribute('data-id', String(id));
  await expect(first).toHaveClass(/imp-big/);
  await expect(first.locator('.mi.imp svg:not(.o)')).toHaveCount(3);
  await expect(first.locator('.imp-qw')).toHaveText('Quick win');
  // Focus starts with it too
  expect(await page.evaluate(() => { const q = priSorted(visible().filter(t => t.stage === 'today')); return q[0].id; })).toBe(id);
  // tapping Big again clears it
  await page.evaluate(id => openDetail(id), id);
  await pill.click();
  await page.locator('#dPicker .imp-c.on').click();
  expect(await page.evaluate(id => S.tasks.find(t => t.id === id).imp, id)).toBeUndefined();
  noErrors(errors);
});

test('1 to 5 shows five circles and a number; Off hides it all and keeps your order', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { setCfg('impStyle', 'num'); openSpace(S.spaces[0].id); });
  const ids = await page.evaluate(() => {
    const ts = S.tasks.filter(t => t.stage === 'today' && shown(t) && listOf(t.list).space === S.space); ts.forEach(t => delete t.pri);
    ts[ts.length - 1].imp = 4; ts[0].imp = 2; save(); render(); return [ts[0].id, ts[ts.length - 1].id];
  });
  const col = page.locator('.col[data-s="today"] .row');
  await expect(col.first()).toHaveAttribute('data-id', String(ids[1]));
  await expect(col.first().locator('.mi.imp b')).toHaveText('4');
  await expect(col.first()).not.toHaveClass(/imp-big/);
  await page.evaluate(id => openDetail(id), ids[0]);
  await page.locator('#dPills .pill[data-p="imp"]').click();
  await expect(page.locator('#dPicker .imp-d')).toHaveCount(5);
  await expect(page.locator('#dPicker .imp-d.on')).toHaveText('2');
  await page.locator('#dPicker .imp-d', { hasText: '5' }).click();
  await page.keyboard.press('Escape');
  await expect(col.first()).toHaveAttribute('data-id', String(ids[0]));
  // Settings → Tasks has the three choices
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await expect(page.locator('#setIn [data-k="impStyle"]')).toHaveText(['Off', 'Small · Medium · Big', '1 to 5']);
  await page.locator('#setIn [data-k="impStyle"][data-v="off"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.col[data-s="today"] .mi.imp')).toHaveCount(0);
  await page.evaluate(id => openDetail(id), ids[0]);
  await expect(page.locator('#dPills .pill[data-p="imp"]')).toHaveCount(0);
  noErrors(errors);
});

test('big-impact tasks are highlights in Wins, and Impact travels with a repeating task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.wins = true; const t = S.tasks.find(x => x.stage === 'today' && !x.inbox);
    t.imp = 5; t.repeat = 'daily'; setStage(t, 'done'); save(); applySettings(); goHome();
  });
  expect(await page.evaluate(() => S.tasks.find(x => x.stage === 'today' && x.imp === 5 && x.showFrom) ? 1 : 0)).toBe(1);
  await page.locator('#tabBar [data-tab="wins"]').click();
  await expect(page.locator('#winsPg .wn-ic.big')).toHaveCount(1);
  await expect(page.locator('#winsPg .wn-it').first()).toContainText('Big impact');
  noErrors(errors);
});
