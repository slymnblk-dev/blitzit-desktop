// QA pass 0.334: fixes found by the full phone + computer sweep.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('a funnel template or a repeat copy never becomes your default list for new tasks', async ({ page }) => {
  const errors = await openApp(page);
  const [a, b] = await page.evaluate(() => { const ls = S.lists.filter(l => l.space === S.spaces[0].id); return [ls[0].id, (ls[1] || S.lists.find(l => l.id !== ls[0].id)).id]; });
  // you add a task to list A: A becomes the default
  await page.evaluate(a => { S.tasks.push(newTask('Mine', 'today', a, 30)); save(); render(); }, a);
  expect(await page.evaluate(() => S.cfg.defList)).toBe(a);
  // a funnel template adds its own example tasks: the default stays A
  await page.evaluate(() => { S.cfg.funnel = true; fnFromTpl(FN_TPL[0]); render(); });
  expect(await page.evaluate(() => S.cfg.defList)).toBe(a);
  // a daily task in list B, then a newer one of yours in A; finishing the daily one makes a copy for tomorrow: still A
  await page.evaluate(([a, b]) => { const t = newTask('Daily walk', 'today', b, 15); t.repeat = 'daily'; S.tasks.push(t); render(); S.tasks.push(newTask('Mine again', 'today', a, 30)); render(); setStage(t, 'done'); save(); render(); }, [a, b]);
  expect(await page.evaluate(() => S.tasks.some(t => t.title === 'Daily walk' && t.showFrom > today()))).toBe(true);
  expect(await page.evaluate(() => S.cfg.defList)).toBe(a);
  noErrors(errors);
});

test('weekly review: a long space · list line ends in an ellipsis on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.spaces[0].name = 'Client work and partnerships international'; S.cfg.review = true; save(); openReview(); });
  const small = page.locator('#reviewPg .rv-tt small').first();
  await expect(small).toBeVisible();
  const s = await small.evaluate(el => ({ to: getComputedStyle(el).textOverflow, over: el.scrollWidth > el.clientWidth }));
  expect(s.to).toBe('ellipsis');
  noErrors(errors);
});

test('goal Focus view: the milestone dots are easy to tap on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '', space: null, why: '', due: gPlus(2), created: Date.now(), ms: [{ id: 'm1', t: '10 km', done: false }, { id: 'm2', t: '21 km', done: false }] }]; save(); applySettings(); openGoal('g1'); });
  const dot = page.locator('#gdPg .gf-dot').nth(1);
  await expect(dot).toBeVisible();
  const box = await dot.boundingBox();
  // 12px below the dot still hits it
  const hit = await page.evaluate(([x, y]) => { const h = document.elementFromPoint(x, y); return !!(h && h.closest('.gf-dot') && h.closest('.gf-dot').dataset.gsel); }, [box.x + box.width / 2, box.y + box.height + 10]);
  expect(hit).toBe(true);
  noErrors(errors);
});

test('Plan: a This week task planned for a day you missed still lands in Today, once; very old plans do not', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    S.cfg.plan = true; save(); applySettings();
    const ws = S.tasks.filter(t => t.stage === 'week' && shown(t)), a = ws[0], b = ws[1];
    a.pl = { d: dkey(Date.now() - 3 * 864e5), s: 540 };     // planned 3 days ago, app not opened since
    b.pl = { d: dkey(Date.now() - 10 * 864e5), s: 540 };    // planned 10 days ago: too old, leave it
    pnRollDay = null; render();
    const first = [a.stage, b.stage];
    setStage(a, 'week'); save(); pnRollDay = null; render();  // you move it back to My week: it stays
    return { first, again: a.stage };
  });
  expect(r.first).toEqual(['today', 'week']);
  expect(r.again).toBe('week');
  noErrors(errors);
});
