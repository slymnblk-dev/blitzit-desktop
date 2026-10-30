// KPIs & OKRs: off by default; a gauge on a space's page opens Scoreboard or Focus; tasks count toward KPIs and key
// results (+N when done, taken back off when reopened, "ask me" asks); logging; OKR close-out and copy; sync, backup, undo.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const inSpace = page => page.evaluate(() => { openSpaceSide(S.spaces[0].id); render(); });
const todayTask = page => page.evaluate(() => S.tasks.find(x => x.list && listOf(x.list).space === S.space && x.stage === 'today').id);

test('KPIs: off by default, gauge on a space, create, link a task, done adds, reopen and undo take it back', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await inSpace(page);
  await expect(page.locator('[data-mxopen]:visible')).toHaveCount(0); // off by default
  await page.evaluate(() => setCfg('mx', true));
  await expect(page.locator('[data-mxopen]:visible')).toHaveCount(1);
  await page.evaluate(() => { goHome(); });
  await expect(page.locator('[data-mxopen]:visible')).toHaveCount(0); // only on a space's page
  await inSpace(page);
  // computers open on the Scoreboard
  await page.locator('[data-mxopen]:visible').click();
  await expect(page.locator('#mxPg')).toHaveClass(/on/);
  await expect(page.locator('#mxIn')).toHaveAttribute('data-look', 'board');
  await page.locator('#mxPg [data-mxnew="kpi"]').first().click();
  await page.fill('#mxPg [data-mxf="name"]', 'Outreach messages');
  await page.fill('#mxPg [data-mxf="target"]', '50');
  await page.locator('#mxPg [data-mxsave]').click();
  await expect.poll(() => page.evaluate(() => S.kpis.map(k => [k.name, k.target, k.period, k.src, k.space === S.space]))).toEqual([['Outreach messages', 50, 'week', 'both', true]]);
  await expect(page.locator('#mxPg .mx-kr')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mxPg')).not.toHaveClass(/on/);
  // link a task from its details: Counts toward, +10
  const id = await todayTask(page);
  await page.evaluate(id => openDetail(id), id);
  await page.locator('#dPills [data-p="mx"]').click();
  await page.locator('#dPicker .pk').first().click();
  await page.locator('#dPicker [data-mxamt]').fill('10');
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).mx.map(l => l.add), id)).toEqual([10]);
  await page.evaluate(() => closeSheets());
  // the row shows just a KPI icon; the details live in its tooltip
  await expect(page.locator(`[data-id="${id}"] .mxp-mi .k:visible`)).toHaveCount(1);
  await expect(page.locator(`[data-id="${id}"] .mxp-mi`).first()).toHaveAttribute('title', 'Counts toward Outreach messages (+10)');
  // done adds; reopening takes it back off; undo of the done takes it back too
  await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); commit(() => setStage(t, 'done'), 'Done'); }, id);
  expect(await page.evaluate(() => mxKpiNow(S.kpis[0]))).toBe(10);
  await page.locator('#undoBtn').click();
  await expect.poll(() => page.evaluate(() => mxKpiNow(S.kpis[0]))).toBe(0);
  await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); setStage(t, 'done'); save(); setStage(t, 'today'); save(); }, id);
  expect(await page.evaluate(() => mxKpiNow(S.kpis[0]))).toBe(0);
  // turned off: nothing counts and the gauge goes away; data stays
  await page.evaluate(() => setCfg('mx', false));
  await page.evaluate(id => { setStage(S.tasks.find(x => x.id === id), 'done'); save(); }, id);
  expect(await page.evaluate(() => [mxKpiNow(S.kpis[0]), S.kpis.length])).toEqual([0, 1]);
  await expect(page.locator('[data-mxopen]:visible')).toHaveCount(0);
  noErrors(errors);
});

test('KPIs: "ask me" asks after done; a logged "latest value" KPI; repeating tasks keep their links; delete unlinks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { setCfg('mx', true); openSpaceSide(S.spaces[0].id); render();
    S.kpis = [{ id: 1, space: S.space, name: 'Demos booked', target: 5, unit: '', period: 'month', better: 'up', src: 'tasks', kind: 'sum', created: Date.now(), log: [] },
      { id: 2, space: S.space, name: 'Reply rate', target: 25, unit: '%', period: 'month', better: 'up', src: 'log', kind: 'last', created: Date.now(), log: [] }]; save(); render(); });
  const id = await todayTask(page);
  await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); t.mx = [{ id: 1, add: null }]; t.repeat = 'daily'; save(); commit(() => setStage(t, 'done'), 'Done'); }, id);
  await expect(page.locator('#mxAsk')).toHaveClass(/on/);
  await page.fill('#mxAskIn', '2');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => mxKpiNow(S.kpis[0]))).toBe(2);
  // the next repeat of the task keeps the link
  expect(await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); return S.tasks.find(x => x.id === t.spawned).mx; }, id)).toEqual([{ id: 1, add: null }]);
  // phones open on Focus; log a latest value from the item view (on phones KPIs & OKRs sit in the header's ⋯)
  await page.locator('#topMore').click(); await page.locator('[data-tpm="mx"]').click();
  await expect(page.locator('#mxIn')).toHaveAttribute('data-look', 'focus');
  await page.locator('#mxPg .mx-ar', { hasText: 'Reply rate' }).click();
  await page.locator('#mxPg .mx-fc [data-mxk]').click();
  await page.fill('#mxLogIn', '18');
  await page.keyboard.press('Enter');
  await page.fill('#mxLogIn', '21');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => mxKpiNow(S.kpis[1]))).toBe(21); // latest, not added up
  await expect(page.locator('#mxPg .mx-ent')).toHaveCount(2);
  // switch the look: remembered for this device size
  await page.keyboard.press('Escape');
  await page.locator('#mxPg [data-mxlook]').click();
  expect(await page.evaluate(() => S.cfg.mxPh)).toBe('board');
  await expect(page.locator('#mxIn')).toHaveAttribute('data-look', 'board');
  // delete a KPI: its history goes, linked tasks stay and stop counting
  await page.locator('#mxPg .mx-kr').first().click();
  await page.locator('#mxPg [data-mxedit]').click();
  await page.locator('#mxPg [data-mxrm]').click();
  await page.locator('#dlgYes').click();
  await expect.poll(() => page.evaluate(() => S.kpis.map(k => k.id))).toEqual([2]);
  expect(await page.evaluate(() => S.tasks.some(t => Array.isArray(t.mx) && t.mx.some(l => l.id === 1)))).toBe(false);
  noErrors(errors);
});

test('OKRs: create with key results, progress, close out to Past, copy to next quarter; sync and backup carry them', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { setCfg('mx', true); setCfg('mxDk', 'board'); openSpaceSide(S.spaces[0].id); render(); });
  await page.locator('[data-mxopen]:visible').click();
  await page.locator('#mxPg [data-mxnew="okr"]').first().click();
  await page.fill('#mxPg [data-mxf="name"]', 'Win 3 pilot customers');
  await page.fill('#mxPg [data-mxkr="0:name"]', 'Book 12 demos');
  await page.fill('#mxPg [data-mxkr="0:target"]', '12');
  await page.locator('#mxPg [data-mxkradd]').click();
  await page.fill('#mxPg [data-mxkr="1:name"]', 'Reply rate');
  // start and unit live under More options
  await expect(page.locator('#mxPg [data-mxkr="1:from"]')).toHaveCount(0);
  await page.locator('#mxPg [data-mxmore]').click();
  await page.fill('#mxPg [data-mxkr="1:from"]', '12');
  await page.fill('#mxPg [data-mxkr="1:target"]', '25');
  await page.fill('#mxPg [data-mxkr="1:unit"]', '%');
  await page.locator('#mxPg [data-mxsave]').click();
  await expect.poll(() => page.evaluate(() => S.okrs.length)).toBe(1);
  // a key result that starts at 0 adds up; one that starts higher keeps the latest value
  await page.evaluate(() => { const o = S.okrs[0]; o.krs[0].log.push({ id: 1, at: Date.now(), v: 3 }, { id: 2, at: Date.now(), v: 3 }); o.krs[1].log.push({ id: 3, at: Date.now() - 1000, v: 15 }, { id: 4, at: Date.now(), v: 18.5 }); save(); render(); });
  expect(await page.evaluate(() => { const o = S.okrs[0]; return [mxKrNow(o.krs[0]), mxKrNow(o.krs[1]), Math.round(mxOkrP(o) * 100)]; })).toEqual([6, 18.5, 50]);
  await expect(page.locator('#mxPg .mx-op')).toHaveText('50%');
  // a task can count toward a key result
  const id = await todayTask(page);
  await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); const o = S.okrs[0]; t.mx = [{ id: o.krs[0].id, okr: o.id, add: 1 }]; setStage(t, 'done'); save(); }, id);
  expect(await page.evaluate(() => mxKrNow(S.okrs[0].krs[0]))).toBe(7);
  // sync and backup carry KPIs and OKRs
  expect(await page.evaluate(() => [localDoc().okrs.length, JSON.parse(backupData()).okrs.length, mergeDocs(localDoc(), { tasks: [], lists: [], spaces: [], okrs: [] }).okrs.length])).toEqual([1, 1, 1]);
  // close it out: the score is kept under Past; copy it to the next quarter
  await page.locator('#mxPg .mx-oh').click();
  await page.locator('#mxPg [data-mxcl]').click();
  await expect.poll(() => page.evaluate(() => [!!S.okrs[0].closed, S.okrs[0].score])).toEqual([true, 0.54]);
  await page.locator('#mxPg [data-mxpast]').click();
  await page.locator('#mxPg .mx-okr.past .mx-oh').click();
  await page.locator('#mxPg [data-mxcopy]').click();
  await expect.poll(() => page.evaluate(() => S.okrs.length)).toBe(2);
  expect(await page.evaluate(() => { const n = S.okrs[1]; return [n.closed || null, n.krs.map(r => [r.name, r.from, r.target, r.log.length])]; })).toEqual([null, [['Book 12 demos', 0, 12, 0], ['Reply rate', 18.5, 25, 0]]]);
  // Settings → Modes has the card with the look per device size
  await page.keyboard.press('Escape');
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .md-card[data-md="mx"]')).toHaveClass(/on/);
  await expect(page.locator('#setIn .md-card[data-md="mx"] [data-k="mxPh"]')).toHaveCount(2);
  noErrors(errors);
});

for (const [w, h, look] of [[390, 844, 'focus']]) {
  test(`Home widget: ${look} by default at ${w}px, rings by choice, tap opens the item, can be turned off`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page);
    await page.evaluate(() => { setCfg('mx', true); const sp = S.spaces[0].id, now = Date.now();
      S.kpis = [{ id: 1, space: sp, name: 'Outreach messages', target: 50, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: now, log: [{ id: 9, at: now, v: 38 }] },
        { id: 2, space: sp, name: 'Demos booked', target: 5, unit: '', period: 'month', better: 'up', src: 'tasks', kind: 'sum', created: now, log: [] }];
      save(); goHome(); render(); });
    const wd = page.locator('.mxw:visible');
    await expect(wd).toHaveCount(1);
    await expect(wd).toHaveClass(new RegExp(look === 'focus' ? 'mxw-rr' : 'mxw-b'));
    await page.evaluate(() => setCfg('mxHw', 'rings'));
    await expect(page.locator('.mxw-r:visible .mxw-ring')).toHaveCount(2);
    // tap a KPI: the popup opens on it, for its own space, even from Home
    await page.locator('.mxw-r:visible .mxw-ring', { hasText: 'Outreach' }).click();
    await expect(page.locator('#mxPg')).toHaveClass(/on/);
    await expect(page.locator('#mxIn .mx-ht b')).toHaveText('Outreach messages');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mxPg')).not.toHaveClass(/on/);
    await page.evaluate(() => setCfg('wMx', false));
    await expect(page.locator('.mxw:visible')).toHaveCount(0);
    noErrors(errors);
  });
}

test('OKR form on a phone: a missing target is shown under the field, the name fills the target', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const errors = await openApp(page);
  await page.evaluate(() => { setCfg('mx', true); openSpaceSide(S.spaces[0].id); render(); });
  await page.locator('#topMore').click(); await page.locator('[data-tpm="mx"]').click();
  await page.locator('#mxPg [data-mxnew="okr"]').first().click();
  await page.locator('#mxPg [data-mxsave]').click();
  await expect(page.locator('#mxPg .mx-errm')).toHaveText('Give the objective a name');
  await page.locator('#mxPg [data-mxf="name"]').pressSequentially('Win 3 customers');
  await expect(page.locator('#mxPg .mx-errm')).toHaveCount(0);
  await page.locator('#mxPg [data-mxkr="0:name"]').pressSequentially('Get referrals');
  await page.locator('#mxPg [data-mxsave]').click();
  await expect(page.locator('#mxPg .mx-errm')).toContainText('Set a target');
  await page.locator('#mxPg [data-mxkr="0:name"]').fill('');
  await page.locator('#mxPg [data-mxkr="0:name"]').pressSequentially('Book 12 demos');
  await expect(page.locator('#mxPg [data-mxkr="0:target"]')).toHaveValue('12');
  await page.locator('#mxPg [data-mxsave]').click();
  await expect.poll(() => page.evaluate(() => S.okrs.map(o => o.krs.map(r => [r.name, r.target])))).toEqual([[['Book 12 demos', 12]]]);
  noErrors(errors);
});

test('computer Home: the KPI card opens the item, and hides with KPIs on Home off', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { setCfg('mx', true); const sp = S.spaces[0].id, now = Date.now();
    S.kpis = [{ id: 1, space: sp, name: 'Outreach messages', target: 50, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: now, log: [{ id: 9, at: now, v: 38 }] }];
    save(); goHome(); render(); });
  await expect(page.locator('#dHome .bn-kpi')).toContainText('Outreach messages');
  await page.locator('#dHome .bn-kpi').click();
  await expect(page.locator('#mxIn .mx-ht b')).toHaveText('Outreach messages');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.evaluate(() => setCfg('wMx', false));
  await expect(page.locator('#dHome .bn-kpi')).toHaveCount(0);
  noErrors(errors);
});

test('the gauge wears an overall progress ring and glows when a linked task moves a number', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => { setCfg('mx', true); S.cfg.fullWidth = false; const sp = S.spaces[0].id, now = Date.now();
    S.kpis = [{ id: 1, space: sp, name: 'Outreach', target: 10, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: now, log: [] }];
    const t = S.tasks.find(x => listOf(x.list).space === sp && x.stage === 'today'); t.mx = [{ id: 1, add: 5 }]; save(); openSpaceSide(sp); render(); return t.id; });
  await expect(page.locator('[data-mxopen]:visible .mxp-ring')).toHaveCount(1);
  await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); commit(() => setStage(t, 'done'), 'Done'); }, id);
  await expect(page.locator('[data-mxopen]:visible')).toHaveClass(/mxp-hit/);
  await expect(page.locator('[data-mxopen]:visible')).toHaveAttribute('title', /50% overall/);
  noErrors(errors);
});
