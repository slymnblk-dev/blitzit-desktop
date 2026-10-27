// Goals ↔ KPIs & OKRs: Measured by (links), New OKR for this goal (milestones → key results), finish lines.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const seed = () => { const now = Date.now(), sp = S.spaces[0].id;
  S.cfg.goals = true; S.cfg.mx = true; S.cfg.gView = 'path';
  S.goals = [{ id: 'g1', name: 'Learn Spanish', e: '', space: sp, why: '', due: '', created: now, star: true,
    ms: [{ id: 'm1', t: 'Basics', done: false, items: [{ id: 'i1', t: 'Lesson 1', done: false }, { id: 'i2', t: 'Lesson 2', done: false }] }, { id: 'm2', t: 'Conversational', done: false }, { id: 'm3', t: 'Story', done: false }] }];
  S.kpis = [{ id: 1, space: sp, name: 'Study minutes', target: 120, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: now, log: [] }];
  S.okrs = [{ id: 3, space: sp, name: 'Talk for 5 minutes', start: dkey(), end: mxQuarterEnd(), created: now, krs: [{ id: 4, name: 'Words learned', from: 0, target: 300, unit: '', log: [{ id: 7, at: now, v: 120 }] }] }];
  save(); applySettings(); openGoal('g1'); };

test('measured by: link from the goal menu, cards on the goal page, tags on Metrics, goal tasks add to a KPI', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(seed);
  await expect(page.locator('#gdPg .gmx')).toHaveCount(0); // nothing forced
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gmlink]').click();
  await page.locator('#gmxPg [data-gmxt="kpi:1"]').click();
  await page.locator('#gmxPg [data-gmxt="okr:3"]').click();
  await page.locator('#gmxPg [data-gmxtasks="1"]').click();
  await page.locator('#gmxPg [data-gmxdone]').click();
  await expect(page.locator('#gdPg .gmx-row.kpi')).toContainText('Study minutes');
  await expect(page.locator('#gdPg .gmx-row.okr')).toContainText('40%');
  // a goal task ticked adds 1 to the KPI; unticking takes it back
  await page.locator('#gdPg .gpp-ts .gm-t [data-gmt]').first().click();
  await expect.poll(() => page.evaluate(() => mxKpiNow(S.kpis[0]))).toBe(1);
  await page.waitForTimeout(450);
  await page.locator('#gdPg .gpp-ts .gm-t [data-gmt]').first().click();
  await expect.poll(() => page.evaluate(() => mxKpiNow(S.kpis[0]) || 0)).toBe(0);
  // Metrics tags them with the goal
  await page.evaluate(() => openMetrics());
  await expect(page.locator('#metricsPg .mt-k .mt-gl')).toContainText('Learn Spanish');
  await expect(page.locator('#metricsPg .mt-o .mt-gl')).toContainText('Learn Spanish');
  // deleting the KPI quietly drops the link
  await page.evaluate(() => { commit(() => { S.kpis = []; }, 'gone'); });
  expect(await page.evaluate(() => S.goals[0].mx.map(l => l.k))).toEqual(['okr']);
  noErrors(errors);
});

test('new OKR for this goal: name filled in, milestones become key results, linked, and each finishes its milestone', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(seed);
  await page.evaluate(() => gmxNewOkr(S.goals[0]));
  await expect(page.locator('#mxPg [data-mxf="name"]')).toHaveValue('Learn Spanish');
  await page.locator('#mxPg [data-gmxms]').click();
  await expect(page.locator('#mxPg [data-mxkr$=":name"]')).toHaveCount(3);
  await page.locator('#mxPg [data-mxsave]').click();
  await expect.poll(() => page.evaluate(() => S.okrs.length)).toBe(2);
  const r = await page.evaluate(() => { const o = S.okrs[1], g = S.goals[0]; return [o.name, o.krs.map(k => k.target), g.mx.some(l => l.k === 'okr' && l.id === o.id), g.ms.map(m => !!m.fin)]; });
  expect(r).toEqual(['Learn Spanish', [1, 1, 1], true, [true, true, true]]);
  // logging a key result to 1 finishes its milestone
  await page.evaluate(() => { const k = S.okrs[1].krs[1]; commit(() => k.log.push({ id: 991, at: Date.now(), v: 1 }), '+1'); });
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[1].done)).toBe(true);
  noErrors(errors);
});

test('finish line: set from the milestone, shows on the milestone, ticks it when the number gets there; reset sticks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(seed);
  await page.evaluate(() => { gSelId = 'm2'; drawGoal(); });
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gfin]').click();
  await page.locator('#gmxPg [data-gfpick^="kr:4"]').click();
  await page.fill('#gfAt', '300');
  await page.locator('#gmxPg [data-gfsave]').click();
  await expect(page.locator('#gdPg .gfl')).toContainText('300');
  await page.evaluate(() => { const k = S.okrs[0].krs[0]; commit(() => k.log.push({ id: 992, at: Date.now(), v: 180 }), '+180'); });
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[1].done)).toBe(true);
  // reset it: it stays open while the number is still there
  await page.evaluate(() => { gMsToggle(S.goals[0], S.goals[0].ms[1]); });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => S.goals[0].ms[1].done)).toBe(false);
  noErrors(errors);
});

test('a goal outside any space can get its own KPI in no space; Metrics shows it under No space', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; S.cfg.mx = true; S.kpis = []; S.okrs = [];
    S.goals = [{ id: 'g1', name: 'Write a book', e: '', space: null, why: '', due: '', created: Date.now(), star: true, view: 'path', ms: [{ id: 'm1', t: 'Draft', done: false }] }];
    save(); applySettings(); openGoal('g1'); });
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gmlink]').click();
  await page.locator('#gmxPg [data-gmxnew="kpi"]').click();
  await expect(page.locator('#mxPg [data-mtpick="none"]')).toHaveClass(/on/);
  await page.fill('#mxPg [data-mxf="name"]', 'Words written');
  await page.fill('#mxPg [data-mxf="target"]', '5000');
  await page.locator('#mxPg [data-mxsave]').click();
  await expect(page.locator('#mxPg')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => [S.kpis[0].space, S.goals[0].mx.length])).toEqual([null, 1]);
  await expect(page.locator('#gdPg .gmx-row.kpi')).toContainText('Words written');
  await page.evaluate(() => openMetrics());
  await expect(page.locator('#metricsPg [data-mtsp="none"]')).toBeVisible();
  await expect(page.locator('#metricsPg .mt-k')).toContainText('No space');
  // tasks in any space can count toward it
  const id = await page.evaluate(() => S.tasks[0].id);
  expect(await page.evaluate(id => mxCands(S.tasks.find(t => t.id === id)).some(c => c.name === 'Words written'), id)).toBe(true);
  noErrors(errors);
});
