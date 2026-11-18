// 0.329: Funnel, an optional Beta mode. Steps are lists in a normal space; finishing tasks fills each step;
// the next step opens half way (or when "always open", opened anyway, or with locks off); tasks can count for more than one.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const on = page => page.evaluate(() => { S.cfg.funnel = true; save(); applySettings(); render(); });
/** Sets up the Sales template and returns step names + list ids. */
const sales = page => page.evaluate(() => { fnFromTpl(FN_TPL[0]); return fnSteps().map(s => ({ list: s.list, name: listOf(s.list).name, target: s.target })); });
const finish = (page, i, n) => page.evaluate(([i, n]) => { fnOpenTasks(fnSteps()[i].list).slice(0, n).forEach(t => setStage(t, 'done')); save(); }, [i, n]);
const model = page => page.evaluate(() => { const m = fnModel(); return { open: m.open, cur: m.cur, stats: m.stats }; });

test('off by default: no tab, no sidebar entry, and the page will not open', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => funnelOn())).toBe(false);
  await expect(page.locator('#sFunnel')).toHaveCount(0);
  await page.evaluate(() => openFunnel());
  await expect(page.locator('#funnelPg')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => tabsList().some(t => t[0] === 'funnel'))).toBe(false);
  noErrors(errors);
});

test('Settings → Modes: the Funnel card sits in the Beta group and switches the mode on', async ({ page }) => {
  const errors = await openApp(page);
  const html = await page.evaluate(() => modesPage());
  expect(html).toContain('data-md="funnel"');
  const inBeta = await page.evaluate(() => { const t = document.createElement('template'); t.innerHTML = modesPage(); return !!t.content.querySelector('.bt-grp [data-md="funnel"]'); });
  expect(inBeta).toBe(true);
  await on(page);
  expect(await page.evaluate(() => tabsList().some(t => t[0] === 'funnel'))).toBe(true);
  noErrors(errors);
});

test('first visit shows templates; Sales makes a normal space with 7 step lists and weekday tasks', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => openFunnel());
  await expect(page.locator('.fn-tpl')).toHaveCount(4);
  await page.locator('[data-fntpl="0"]').click();
  await expect(page.locator('.fn-row')).toHaveCount(7);
  const r = await page.evaluate(() => { const sp = fnSpace(), ls = S.lists.filter(l => l.space === sp.id), ts = S.tasks.filter(t => ls.some(l => l.id === t.list));
    return { space: sp.name, lists: ls.map(l => l.name), tasks: ts.length, allToday: ts.every(t => t.stage === 'today' && t.repeat === 'weekdays'), targets: fnSteps().map(s => s.target) }; });
  expect(r.space).toBe('Sales outreach');
  expect(r.lists).toEqual(['Prospects', 'Outreach', 'Replies', 'Conversations', 'Asks', 'Demos', 'Learning']);
  expect(r.tasks).toBe(16);
  expect(r.allToday).toBe(true);
  expect(r.targets).toEqual([2, 4, 3, 3, 2, 1, 1]);
  await expect(page.locator('#sFunnel')).toBeVisible();
  // the funnel is one clipped shape
  expect(await page.evaluate(() => document.getElementById('fnShape').style.clipPath)).toContain('path(');
  noErrors(errors);
});

test('the next step opens half way through the one before (Outreach target 4 → Replies opens at 2)', async ({ page }) => {
  const errors = await openApp(page);
  await on(page); await sales(page);
  let m = await model(page);
  expect(m.open.slice(0, 3)).toEqual([true, false, false]);
  await finish(page, 0, 1);                     // 1 of 2 prospects = half → Outreach opens
  m = await model(page);
  expect(m.open[1]).toBe(true);
  expect(m.open[2]).toBe(false);
  await finish(page, 1, 1);                     // 1 of 4 outreach: not yet
  expect((await model(page)).open[2]).toBe(false);
  await finish(page, 1, 1);                     // 2 of 4 = half
  m = await model(page);
  expect(m.open[2]).toBe(true);
  expect(m.stats[1]).toMatchObject({ c: 2, goal: 4, full: false });
  noErrors(errors);
});

test('a locked step asks first; "Open anyway" is remembered for today; "always open" and "Open all steps" skip locks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await on(page); const steps = await sales(page);
  await page.evaluate(() => { fnSel = null; openFunnel(); });
  await page.locator(`[data-fnstep="${steps[2].list}"]`).click();
  await expect(page.locator('.fn-ask')).toContainText('Replies opens after Outreach');
  await page.locator('[data-fnany]').click();
  await expect(page.locator('.fn-ask')).toHaveCount(0);
  expect((await model(page)).open[2]).toBe(true);
  expect(await page.evaluate(() => S.cfg.fn.unl.lists.length)).toBe(1);
  // a new day forgets it
  await page.evaluate(() => { S.cfg.fn.unl.d = '2000-01-01'; });
  expect((await model(page)).open[2]).toBe(false);
  // always open
  await page.evaluate(() => { S.cfg.fn.steps[3].open = true; });
  expect((await model(page)).open[3]).toBe(true);
  // locks off
  await page.evaluate(() => { S.cfg.fnFree = true; });
  expect((await model(page)).open.every(Boolean)).toBe(true);
  noErrors(errors);
});

test('a task can count for more than one, and its repeating copy keeps the count', async ({ page }) => {
  const errors = await openApp(page);
  await on(page); await sales(page);
  const r = await page.evaluate(() => { const st = fnSteps()[1], t = fnOpenTasks(st.list)[0]; t.amt = 3; setStage(t, 'done');
    const copy = S.tasks.find(x => x.id === t.spawned); return { stat: fnStat(st), copyAmt: copy && copy.amt }; });
  expect(r.stat).toMatchObject({ c: 3, goal: 4 });
  expect(r.copyAmt).toBe(3);
  noErrors(errors);
});

test('no target: a step is full when its tasks for today are done', async ({ page }) => {
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => fnFromTpl(FN_TPL[3]));          // Start empty: no targets, no tasks
  let m = await model(page);
  expect(m.open).toEqual([true, true, true]);                // nothing planned before = nothing to wait for
  await page.evaluate(() => { const l = fnSteps()[0].list; S.tasks.push(newTask('A', 'today', l, 15), newTask('B', 'today', l, 15)); });
  m = await model(page);
  expect(m.stats[0]).toMatchObject({ c: 0, goal: 2 });
  expect(m.open[1]).toBe(false);
  await finish(page, 0, 1);
  m = await model(page);
  expect(m.open[1]).toBe(true);
  noErrors(errors);
});

test('the fill bar shows the progress; ticking and adding work from the panel', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); const steps = await sales(page);
  await page.evaluate(() => { fnSel = null; openFunnel(); });
  await page.locator('.fn-task.now [data-fntick]').click();     // 1 of 2 prospects
  const w = await page.locator(`[data-fnstep="${steps[0].list}"] .fn-fill`).evaluate(e => e.style.width);
  expect(parseFloat(w)).toBe(50);
  await page.locator('#fnNew').fill('Enrich contact list');
  await page.locator('#fnNew').press('Enter');
  await expect(page.locator('.fn-task')).toContainText(['Find decision makers', 'Enrich contact list']);
  expect(await page.evaluate(l => S.tasks.some(t => t.title === 'Enrich contact list' && t.list === l && t.stage === 'today'), steps[0].list)).toBe(true);
  noErrors(errors);
});

test('move a task to another step; delete a step and its tasks move to the step before', async ({ page }) => {
  const errors = await openApp(page);
  await on(page); const steps = await sales(page);
  const r = await page.evaluate(([a, b, c]) => {
    const t = fnOpenTasks(a)[0]; fnMoveTask(t, b); const moved = t.list === b;
    const n = S.tasks.filter(x => x.list === c).length; fnDelStep(c);
    return { moved, gone: !fnSteps().some(s => s.list === c) && !S.lists.some(l => l.id === c), landed: S.tasks.filter(x => x.list === b).length >= n + 1, left: fnSteps().length };
  }, [steps[0].list, steps[1].list, steps[2].list]);
  expect(r).toEqual({ moved: true, gone: true, landed: true, left: 6 });
  // never fewer than 3 steps
  const keep = await page.evaluate(() => { while (fnSteps().length > 3) fnDelStep(fnSteps()[0].list); fnDelStep(fnSteps()[0].list); return fnSteps().length; });
  expect(keep).toBe(3);
  noErrors(errors);
});

test('switching the mode off closes the page and keeps the space and tasks; a list deleted elsewhere just drops out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await on(page); const steps = await sales(page);
  await page.evaluate(() => openFunnel());
  await page.evaluate(() => { S.cfg.funnel = false; save(); applySettings(); render(); });
  await expect(page.locator('#funnelPg')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => tabsList().some(t => t[0] === 'funnel'))).toBe(false);
  expect(await page.evaluate(() => !!fnSpace() && S.tasks.filter(t => fnSteps().some(s => s.list === t.list)).length)).toBe(16);
  const left = await page.evaluate(l => { S.cfg.funnel = true; S.lists = S.lists.filter(x => x.id !== l); openFunnel(); return fnSteps().length; }, steps[6].list);
  expect(left).toBe(6);
  await expect(page.locator('.fn-row')).toHaveCount(6);
  noErrors(errors);
});

test('the funnel settings travel with sync (they live in cfg)', async ({ page }) => {
  const errors = await openApp(page);
  await on(page); await sales(page);
  expect(await page.evaluate(() => localDoc().cfg.fn.steps.length)).toBe(7);
  noErrors(errors);
});

// ---------- 0.330: Focus view, view switch, default view, quiet note + unlock glow ----------
test('Funnel | Focus switch; the page opens in the default view from Settings', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => openFunnel());
  await expect(page.locator('#fnShape')).toBeVisible();
  await page.locator('[data-fnview="focus"]').click();
  await expect(page.locator('.fn-hero')).toBeVisible();
  await expect(page.locator('#fnShape')).toHaveCount(0);
  await expect(page.locator('.fn-seg')).toHaveCount(7);
  // Settings → Modes → Funnel → Start in: Focus
  await page.evaluate(() => { closeFunnel(); openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-btgrp]').click();                 // the Beta group starts folded
  await page.locator('[data-fnsetview="focus"]').click();
  expect(await page.evaluate(() => S.cfg.fnView)).toBe('focus');
  await page.evaluate(() => { try { closeSettings(); } catch {} openFunnel(); });
  await expect(page.locator('.fn-hero')).toBeVisible();
  noErrors(errors);
});

test('Focus view: the hero shows the task you are on; Done ticks it and the next one moves up; Start opens focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => { S.cfg.fnView = 'focus'; fnSel = null; openFunnel(); window.__blitz = []; startBlitz = q => window.__blitz.push(q[0].title); });
  await expect(page.locator('.fn-hero .fn-ht')).toContainText('Research ICP accounts');
  await page.locator('.fn-hero [data-fntick]').click();
  await expect(page.locator('.fn-hero .fn-ht')).toContainText('Find decision makers');
  await page.locator('.fn-hero [data-fngo]').click();
  expect(await page.evaluate(() => window.__blitz)).toEqual(['Find decision makers']);
  noErrors(errors);
});

test('when a step opens: a quiet line says so and the new step glows once (no toast)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); const steps = await sales(page);
  await page.evaluate(() => { fnSel = null; openFunnel(); });
  await page.locator('.fn-task.now [data-fntick]').click();          // 1 of 2 prospects → Outreach opens
  await expect(page.locator('.fn-note')).toContainText('Outreach is open now');
  await expect(page.locator(`[data-fnstep="${steps[1].list}"]`)).toHaveClass(/flash/);
  await page.locator('.fn-task.now [data-fntick]').click();          // 2 of 2 → Prospects done
  await expect(page.locator('.fn-note')).toContainText('Prospects done');
  noErrors(errors);
});

test('Focus view on an empty step is calm and points to the next open step; works in Classic too', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.ui = 'classic'; save(); applySettings(); render(); });
  await on(page); await page.evaluate(() => fnFromTpl(FN_TPL[3]));     // Start empty: 3 open steps, no tasks
  await page.evaluate(() => { S.cfg.fnView = 'focus'; openFunnel(); });
  await expect(page.locator('.fn-hero.calm')).toContainText('Nothing planned in Step 1');
  await page.locator('.fn-hero [data-fngoto]').click();
  await expect(page.locator('.fn-seg.sel')).toContainText('Step 2');
  noErrors(errors);
});

// ---------- 0.331: optional targets, past days, Home card, funnel done → a Win, Plan/Journal buttons ----------
test('daily and weekly targets count finished tasks in one step; none set = no line', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => openFunnel());
  await expect(page.locator('.fn-goal')).toHaveCount(0);
  await expect(page.locator('.fn-ginv')).toBeVisible();                     // no goals yet: one quiet invite
  const r = await page.evaluate(() => { const st = fnSteps(); S.cfg.fn.daily = { list: st[0].list, n: 2 }; S.cfg.fn.weekly = { list: st[0].list, n: 5 };
    const t = fnOpenTasks(st[0].list)[0]; t.amt = 2; setStage(t, 'done');
    const old = newTask('Earlier', 'done', st[0].list, 15); old.doneAt = Date.now() - 864e5; S.tasks.push(old);   // yesterday: counts for the week only if same week
    drawFunnel(); return { d: fnTarget('daily'), w: fnTarget('weekly'), sameWeek: fnWeekStart(dkey(Date.now() - 864e5)) === fnWeekStart(today()) }; });
  expect(r.d).toMatchObject({ c: 2, n: 2 });
  expect(r.w.c).toBe(r.sameWeek ? 3 : 2);
  await expect(page.locator('.fn-goal')).toHaveCount(2);                   // 0.333: goal cards under the funnel's tip
  await expect(page.locator('.fn-goal').first()).toContainText('2/2');
  await expect(page.locator('.fn-goal').first()).toHaveClass(/met/);
  await expect(page.locator('.fn-ysplit')).toHaveCount(1);
  noErrors(errors);
});

test('‹ past days ›: yesterday shows what was finished, read only; today has no "next"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => { const l = fnSteps()[0].list, t = newTask('Old prospect', 'done', l, 15); t.doneAt = Date.now() - 864e5; S.tasks.push(t); save(); fnSel = null; openFunnel(); });
  await expect(page.locator('[data-fnday="1"]')).toBeDisabled();
  await page.locator('[data-fnday="-1"]').click();
  await expect(page.locator('.pg-sum')).toContainText('1 finished that day');
  await expect(page.locator('.fn-task.ro')).toContainText('Old prospect');
  await expect(page.locator('#fnNew')).toHaveCount(0);
  await expect(page.locator('[data-fnview]')).toHaveCount(0);
  await page.locator('[data-fnday="0"]').click();
  await expect(page.locator('#fnNew')).toBeVisible();
  noErrors(errors);
});

test('Home: the optional Now card shows the task you are on, and Start opens focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => { goHome(); render(); });
  await expect(page.locator('.fn-home')).toHaveCount(0);                  // off by default
  await page.evaluate(() => { S.cfg.fnHome = true; save(); window.__blitz = []; startBlitz = q => window.__blitz.push(q[0].title); render(); });
  await expect(page.locator('.fn-home:visible')).toContainText('Research ICP accounts');
  await page.locator('[data-fnhgo]:visible').click();
  expect(await page.evaluate(() => window.__blitz)).toEqual(['Research ICP accounts']);
  expect(await page.evaluate(() => hkLayers('ciCard'))).toContain('funnel');
  noErrors(errors);
});

test('the whole funnel done → a quiet "You won the day" and one Win (once a day)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.wins = true; });
  await on(page); await page.evaluate(() => fnFromTpl(FN_TPL[3]));
  await page.evaluate(() => { fnSteps().forEach(s => S.tasks.push(newTask('Do ' + listOf(s.list).name, 'today', s.list, 15))); save(); openFunnel(); });
  const before = await page.evaluate(() => (S.wins || []).length);
  for (let i = 0; i < 3; i++) { await page.locator(`.fn-row >> nth=${i}`).click(); await page.locator('.fn-task.now [data-fntick]').click(); }
  await expect(page.locator('.fn-note')).toContainText('You won the day');
  expect(await page.evaluate(() => S.wins.filter(w => w.t.startsWith('Funnel done')).length)).toBe(1);
  expect(await page.evaluate(() => S.wins.length)).toBe(before + 1);
  noErrors(errors);
});

test('Plan and Journal buttons show only when those modes are on, and open them', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => openFunnel());
  await expect(page.locator('[data-fnplan],[data-fnjr]')).toHaveCount(0);
  await page.evaluate(() => { S.cfg.plan = true; S.cfg.journal = true; save(); applySettings(); render(); openFunnel(); });
  await page.locator('[data-fnplan]').click();
  await expect(page.locator('#funnelPg')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => pnOn)).toBe(true);
  noErrors(errors);
});

test('0.332: whole-funnel targets are picked from the app menu (no native dropdown)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); await sales(page);
  await page.evaluate(() => { openFunnel(); fnEdit = true; drawFunnel(); });
  await expect(page.locator('#funnelPg select')).toHaveCount(0);
  await page.locator('[data-fntgl="daily"]').click();
  await page.locator('.cx-it, .cx button, [role="menuitem"]').filter({ hasText: 'Conversations' }).first().click();
  expect(await page.evaluate(() => listOf(S.cfg.fn.daily.list).name + ' ' + S.cfg.fn.daily.n)).toBe('Conversations 2');
  await expect(page.locator('[data-fntgl="daily"]')).toContainText('Conversations');
  noErrors(errors);
});

test('0.333 polish: step said once, only the next locked step speaks, coming-up card, one goal = straight stem, invite opens editing', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await on(page); const steps = await sales(page);
  await page.evaluate(() => { fnSel = null; openFunnel(); });
  await expect(page.locator('.fn-head .pg-sum')).toHaveText('16 to do today');
  await expect(page.locator('.fn-row.lock svg')).toHaveCount(0);            // no lock icons on rows
  await expect(page.locator('.fn-row.next')).toHaveCount(1);
  await expect(page.locator(`.fn-row.next[data-fnstep="${steps[1].list}"]`)).toContainText('opens at 1/2');
  await expect(page.locator('.fn-coming')).toContainText('Outreach opens after 1 more in Prospects');
  await expect(page.locator('.fn-row.sel')).toHaveCount(1);
  await page.evaluate(l => { S.cfg.fn.weekly = { list: l, n: 5 }; drawFunnel(); }, steps[5].list);
  await expect(page.locator('.fn-goal')).toHaveCount(1);
  await expect(page.locator('.fn-stem')).toHaveCount(1);
  await expect(page.locator('.fn-ysplit')).toHaveCount(0);
  await page.evaluate(() => { S.cfg.fn.weekly = null; drawFunnel(); });
  await page.locator('.fn-ginv').click();
  await expect(page.locator('.fn-ed')).toBeVisible();
  noErrors(errors);
});
