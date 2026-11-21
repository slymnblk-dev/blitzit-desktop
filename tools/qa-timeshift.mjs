// Usage: PW_CHROMIUM=<chrome> node tools/qa-timeshift.mjs  (data made today, app reopened 1, 8 and 40 days later; prints state + errors)
// Time travel: set up data today (every mode on, some done tasks, repeats, routines, journal, plan blocks, funnel),
// then reopen the app N days later (same storage) and open every page; report errors and odd states.
import { chromium } from 'playwright';
import { FAKE_SUPABASE } from '../tests/helpers.mjs';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
for (const dev of [[390, 844], [1400, 900]]) {
  const ctx = await b.newContext({ viewport: { width: dev[0], height: dev[1] }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.addInitScript(FAKE_SUPABASE);
  await p.goto('http://localhost:4173/index.html'); await p.waitForTimeout(1000);
  await p.evaluate(() => {
    Object.assign(S.cfg, { habits: true, goals: true, vision: true, journal: true, jEnergy: true, plan: true, routines: true, wins: true, inbox: true, mx: true, funnel: true, closeDay: true, review: true, fnHome: true });
    fnFromTpl(FN_TPL[0]);
    const r = rtFromTpl(RT_TPL[2]); r.days = [0, 1, 2, 3, 4, 5, 6]; r.at = '07:00'; r.rem = 1; S.routines = [r]; r.log[today()] = 1;
    const ts = S.tasks.filter(t => t.stage === 'today' && !t.inbox);
    ts[0].repeat = 'daily'; setStage(ts[0], 'done'); ts[1].repeat = 'weekly'; setStage(ts[1], 'done'); setStage(ts[2], 'done');
    ts[3].pl = { d: today(), s: 600 }; S.blocks = [{ id: 9, t: 'Lunch', d: today(), s: 720, len: 60, rep: true }, { id: 10, t: 'Dentist', d: today(), s: 900, len: 60 }];
    const w = S.tasks.find(t => t.stage === 'week'); w.pl = { d: pnTomorrow(), s: 540 };
    S.journal = [{ id: 5, d: today(), am: 'Ship it', pm: 'Shipped', mood: 5, en: [{ at: Date.now(), v: 3 }] }];
    S.habits = [{ id: 'h1', name: 'Walk', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done: { [today()]: 1 }, created: Date.now() - 5 * 864e5 }];
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: null, why: '', due: gPlus(1), created: Date.now(), ms: [{ id: 'm1', t: '10 km', done: true, doneAt: Date.now() }, { id: 'm2', t: '21 km', done: false }] }];
    save(); render();
  });
  const saved = await p.evaluate(() => localStorage.getItem('blitzit-v1'));
  await ctx.close();
  for (const days of [1, 8, 40]) {
    const c2 = await b.newContext({ viewport: { width: dev[0], height: dev[1] }, reducedMotion: 'reduce' });
    const q = await c2.newPage(); const errs = [];
    q.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400)));
    q.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)) });
    await q.addInitScript(FAKE_SUPABASE);
    await q.addInitScript(([s, d]) => { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('blitzit-v1', s); sessionStorage.setItem('__seeded', 1) }
      const D = Date, off = d * 864e5; Date = class extends D { constructor(...a) { super(...(a.length ? a : [D.now() + off])) } static now() { return D.now() + off } }; }, [saved, days]);
    await q.goto('http://localhost:4173/index.html'); await q.waitForTimeout(1200);
    const state = await q.evaluate(() => ({
      today: today(), todayTasks: S.tasks.filter(t => shown(t) && t.stage === 'today').length,
      repeatsShown: S.tasks.filter(t => t.repeat !== 'none' && shown(t) && t.stage !== 'done').map(t => t.title),
      weekPlannedMovedToToday: S.tasks.filter(t => t.pl && t.stage === 'today').map(t => t.title + '@' + t.pl.d),
      blocksToday: (typeof pnBlocks === 'function') ? (pnBlocks().map(b => b.t)) : null,
      routineDue: typeof rtNext === 'function' ? (rtNext() || {}).name || null : null,
    }));
    const opened = [];
    for (const f of ['goHome()', 'openSpace(S.spaces[0].id)', 'openInbox()', 'openRhythm()', 'openGoals()', "openGoal('g1')", 'openMetrics()', 'openWins()', 'openRoutines()', 'openPlan()', 'openJournal()', 'openVision()', 'openFunnel()', 'openReview()', 'openCloseDay()', 'openSettings()']) {
      try { await q.evaluate(`try{closeSheets()}catch(e){};goHome();${f}`); await q.waitForTimeout(250); opened.push(f) } catch (e) { errs.push(f + ' -> ' + String(e).slice(0, 200)) }
    }
    console.log(JSON.stringify({ w: dev[0], days, state, errors: errs.length }));
    errs.slice(0, 5).forEach(e => console.log('  ' + e));
    await c2.close();
  }
}
await b.close();
