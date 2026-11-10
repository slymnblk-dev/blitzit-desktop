// Flow: a second design you switch on in Settings → Appearance → Design (0.302). Classic stays the default and unchanged.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const phone = page => page.setViewportSize({ width: 390, height: 844 });
const desk = page => page.setViewportSize({ width: 1400, height: 900 });
const flow = (page, extra = {}) => page.evaluate(x => { S.cfg.ui = 'flow'; Object.assign(S.cfg, x); save(); applySettings(); goHome(); }, extra);
const todayTask = page => page.evaluate(() => { const t = S.tasks.find(x => shown(x) && x.stage !== 'done'); t.stage = 'today'; save(); render(); return t.id; });

test('Classic is the default: no Flow marks anywhere; Flow switches on and off from Settings', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await todayTask(page);
  expect(await page.evaluate(() => [S.cfg.ui, document.documentElement.dataset.ui || null])).toEqual(['classic', null]);
  await expect(page.locator('.fl-acts, .fl-recap, .fl-ex')).toHaveCount(0);
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('#flSec [data-k="ui"][data-v="flow"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'flow');
  await expect(page.locator('#flSec [data-tg]')).toHaveCount(11);                    // every part has its own switch, all on
  expect(await page.locator('#flSec [data-tg]').evaluateAll(b => b.every(x => x.getAttribute('aria-pressed') === (x.dataset.tg === 'flThumb' ? 'false' : 'true')))).toBe(true); // all on, except Thumb-first (off by default since 0.316)
  // one part off: only that part goes back to Classic
  await page.locator('#flSec [data-tg="flNext"]').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.fl.split(' ').includes('next'))).toBe(false);
  await page.evaluate(() => { closeSettings(); goHome(); });
  await expect(page.locator('#homeView .fl-acts')).toHaveCount(0);
  await page.evaluate(() => { S.cfg.flNext = true; applySettings(); render(); });
  await expect(page.locator('#homeView .fl-acts')).toHaveCount(1);
  // back to Classic: every Flow piece is gone
  await page.evaluate(() => setCfg('ui', 'classic'));
  await expect(page.locator('html')).not.toHaveAttribute('data-ui', 'flow');
  await expect(page.locator('.fl-acts, .fl-recap, .fl-ex')).toHaveCount(0);
  noErrors(errors);
});

test('next: Start, Done and Later on the Up next card (phone and computer), with Undo', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await flow(page);
  await page.evaluate(() => { S.tasks.forEach(t => { if (t.stage === 'today') t.stage = 'week'; }); save(); render(); });
  const id = await todayTask(page);
  await expect(page.locator('#homeView .fl-acts')).toHaveAttribute('data-flt', String(id));
  await expect(page.locator('#homeView .fl-of')).toHaveText('1 of 1 today');
  await page.evaluate(() => { window.__started = []; window.startBlitz = q => window.__started.push(q.map(t => t.id)); });
  await page.locator('#homeView [data-flgo]').click();
  expect(await page.evaluate(() => window.__started)).toEqual([[id]]);
  expect(await page.evaluate(() => S.space)).toBe(null);                              // the card's own tap (open the space) didn't fire
  await page.locator('#homeView [data-fllater]').click();
  expect(await page.evaluate(i => S.tasks.find(t => t.id === i).stage, id)).toBe('week');
  await page.locator('#undoBtn').click();
  expect(await page.evaluate(i => S.tasks.find(t => t.id === i).stage, id)).toBe('today');
  await page.locator('#homeView [data-fldone]').click();
  expect(await page.evaluate(i => S.tasks.find(t => t.id === i).stage, id)).toBe('done');
  // computer: the same buttons on the calm Up next card
  await desk(page);
  await todayTask(page);
  await page.evaluate(() => { goHome(); });
  await expect(page.locator('#dHome .cm-up .fl-acts')).toHaveCount(1);
  await expect(page.locator('#dHome .cm-up .cm-go')).toBeHidden();
  noErrors(errors);
});

test('presets: Simple / Planner / Everything set the modes, and Undo puts them back', async ({ page }) => {
  const errors = await openApp(page);
  await flow(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.goals = true; save(); applySettings(); openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .fl-pc')).toHaveCount(3);
  await expect(page.locator('#setIn .fl-cus')).toBeVisible();                        // a mix of your own reads "Custom"
  await page.locator('#setIn [data-flpre="simple"]').click();
  const m = () => page.evaluate(() => ['inbox', 'plan', 'habits', 'goals', 'mx', 'wins', 'routines', 'journal'].map(k => k === 'inbox' ? S.cfg.inbox !== false : !!S.cfg[k]));
  expect(await m()).toEqual([false, false, false, false, false, false, false, false]);
  await expect(page.locator('#setIn [data-flpre="simple"]')).toHaveClass(/on/);
  await page.locator('#undoBtn').click();
  expect((await m()).slice(2, 4)).toEqual([true, true]);
  await page.locator('#setIn [data-flpre="all"]').click();
  expect(await m()).toEqual([true, true, true, true, true, true, true, true]);
  await page.locator('#setIn [data-flpre="planner"]').click();
  expect(await m()).toEqual([true, true, false, false, false, false, false, false]);
  // Classic: no presets on the Modes page
  await page.evaluate(() => { S.cfg.ui = 'classic'; applySettings(); drawSettings(); });
  await expect(page.locator('#setIn .fl-pc')).toHaveCount(0);
  noErrors(errors);
});

test('plus: on the Habits page the + opens the menu with Habit first; on a computer board the floating + shows', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await flow(page, { habits: true });
  await page.evaluate(() => openRhythm());
  const plus = page.locator('#tbAdd:visible, #addBtn:visible').first();
  await plus.click();
  await expect(page.locator('#nwMenu.on')).toBeVisible();
  await expect(page.locator('#nwMenu [data-nwk]').last()).toHaveAttribute('data-nwk', 'habit');
  await expect(page.locator('#nwMenu .fl-sug .fl-sugl')).toHaveText('Suggested');
  await page.locator('#nwX').click();
  // Classic keeps the direct add on Habits (no menu)
  await page.evaluate(() => { S.cfg.ui = 'classic'; applySettings(); });
  await plus.click();
  await expect(page.locator('#nwMenu.on')).toHaveCount(0);
  await page.evaluate(() => { closeSheets(); closeRhythm(); });
  await desk(page);
  await page.evaluate(() => { S.cfg.ui = 'flow'; applySettings(); openSpace(S.spaces[0].id); });
  await expect(page.locator('#nwFab')).toBeVisible();
  await page.evaluate(() => { S.cfg.ui = 'classic'; applySettings(); render(); });
  await expect(page.locator('#nwFab')).toBeHidden();
  noErrors(errors);
});

test('inline: the pencil next to the space name renames it; Enter saves (with Undo), Escape cancels', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await flow(page);
  const sp = await page.evaluate(() => { const s = S.spaces[0]; openSpace(s.id); return s.id; });
  const name = () => page.evaluate(id => spaceOf(id).name, sp);
  const was = await name();
  await page.locator('#fwNav [data-flren]').click();
  await page.locator('#flRen').fill('Deep work');
  await page.keyboard.press('Enter');
  expect(await name()).toBe('Deep work');
  await page.locator('#undoBtn').click();
  expect(await name()).toBe(was);
  await page.locator('#fwNav [data-flren]').click();
  await page.locator('#flRen').fill('Nope');
  await page.keyboard.press('Escape');
  expect(await name()).toBe(was);
  await expect(page.locator('#flRen')).toHaveCount(0);
  // a list: the pencil renames the list
  const l = await page.evaluate(id => { const l = S.lists.find(x => x.space === id); S.list = l.id; render(); return l.id; }, sp);
  await page.locator('#fwNav [data-flren]').click();
  await page.locator('#flRen').fill('Errands');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(id => listOf(id).name, l)).toBe('Errands');
  // Classic: no pencil
  await page.evaluate(() => { S.cfg.ui = 'classic'; applySettings(); render(); });
  await expect(page.locator('#fwNav [data-flren]')).toHaveCount(0);
  noErrors(errors);
});

test('wins: a burst on each tick; the weekly recap shows Sunday/Monday once something is done, and stays closed', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await flow(page);
  await page.evaluate(() => { window.__flDay = 3; render(); });
  await expect(page.locator('.fl-recap')).toHaveCount(0);                            // midweek: no recap
  await page.evaluate(() => { window.__flDay = 0; S.tasks.forEach(t => { delete t.doneAt; if (t.stage === 'done') t.stage = 'week'; }); render(); });
  await expect(page.locator('.fl-recap')).toHaveCount(0);                            // nothing done: no recap
  await page.evaluate(() => { const ts = S.tasks.filter(t => t.stage !== 'done').slice(0, 3); ts.forEach(t => { t.stage = 'done'; t.doneAt = Date.now() - 3600e3; }); save(); render(); });
  await expect(page.locator('#homeView .fl-recap .fl-rn')).toHaveText('3');
  await page.locator('#homeView [data-flrx]').click();
  await expect(page.locator('.fl-recap')).toHaveCount(0);
  await page.evaluate(() => render());
  await expect(page.locator('.fl-recap')).toHaveCount(0);
  // the burst
  await page.evaluate(() => { S.cfg.motion = true; applySettings(); openSpace(S.spaces[0].id); S.stage = 'week'; render(); });
  await page.locator('#list .row [data-check]').first().click();
  await expect(page.locator('.fl-burst')).toHaveCount(1);
  noErrors(errors);
});

test('empty, thumb, panel: example row + Add a task; phone stage tabs at the bottom; computer details slide over a dimmed, blurred board', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await flow(page);
  await page.evaluate(() => { const sp = S.spaces[0].id; S.tasks.forEach(t => { if (listOf(t.list).space === sp && t.stage === 'backlog') t.stage = 'week'; }); openSpace(sp); S.stage = 'backlog'; render(); });
  await expect(page.locator('#list .fl-ex')).toBeVisible();
  await page.locator('#list [data-fladd]').click();
  await expect(page.locator('#addSheet.on')).toBeVisible();
  await page.evaluate(() => closeSheets());
  // thumb (a switch, off by default since 0.316): the stage tabs sit near the bottom
  await page.evaluate(() => { S.cfg.flThumb = true; applySettings(); render(); });
  const g = await page.locator('#gauge').boundingBox();
  expect(g.y).toBeGreaterThan(600);
  await page.evaluate(() => { S.cfg.flThumb = false; applySettings(); render(); });
  expect((await page.locator('#gauge').boundingBox()).y).toBeLessThan(400);
  // panel (computer)
  await desk(page);
  await page.evaluate(() => { const t = S.tasks.find(x => shown(x) && x.stage !== 'done' && listOf(x.list).space === S.spaces[0].id); render(); openDetail(t.id); });
  // the board keeps its full width (nothing squeezed); the panel sits on top; the board behind is dimmed and blurred
  const w0 = await page.evaluate(() => document.querySelector('.board').getBoundingClientRect().width);
  await expect(page.locator('#detailSheet.on')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.main')).marginRight)).toBe('0px');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.scrim.on')).backdropFilter)).toContain('blur');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.scrim.on')).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  const box = await page.locator('#detailSheet .sheet-in').boundingBox();
  expect(Math.round(box.x + box.width)).toBe(1400);                           // flush right
  expect(box.width).toBeGreaterThan(440);
  expect(await page.evaluate(() => document.querySelector('.board').getBoundingClientRect().width)).toBe(w0);
  // a click on the dimmed board closes it
  await page.mouse.click(300, 450);
  await expect(page.locator('#detailSheet.on')).toHaveCount(0);
  noErrors(errors);
});

// the Flow look (0.303): one fixed brand. No Classic theme colour may show on any page, in dark or light.
const PAGES = [['home', 'goHome()'], ['board', "openSpace(S.spaces[0].id);S.stage='today';render()"],
  ['add', "goHome();document.getElementById('addBtn').click()"],
  ['detail', "closeSheets();openSpace(S.spaces[0].id);openDetail(S.tasks.find(x=>shown(x)&&x.stage!=='done'&&listOf(x.list).space===S.spaces[0].id).id)"],
  ['inbox', 'closeSheets();openInbox()'], ['habits', 'closeInbox();openRhythm()'], ['goals', 'closeRhythm();openGoals()'],
  ['wins', 'closeGoals();openWins()'], ['routines', 'closeWins();openRoutines()'], ['plan', 'closeRoutines();openPlan()'],
  ['journal', 'closePlan();openJournal()'], ['metrics', 'closeJournal();openMetrics()'], ['settings', 'closeMetrics();openSettings()'],
  ['you', "setView='you';drawSettings()"], ['review', 'closeSettings();openReview()'],
  ['bento home', "try{closeReview()}catch(e){};S.cfg.homeLayout='bento';applySettings();goHome();render()"], ['all tasks', "S.cfg.homeLayout='calm';applySettings();openSpace('all');render()"]];
const classicLeaks = () => {
  const hex = h => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
  const bad = new Set(); Object.values(THEMES).flat().forEach(t => ['bg', 'side', 'surface', 'surface2'].forEach(k => bad.add(hex(t.v[k]))));
  // colours that are also Flow's own (white, Flow's ink) don't count
  const probe = document.createElement('i'); document.body.appendChild(probe);
  ['--bg', '--side', '--surface', '--surface2', '--text', '--ink', '--fl-ink'].forEach(v => { probe.style.backgroundColor = `var(${v})`; bad.delete(getComputedStyle(probe).backgroundColor); });
  bad.delete('rgb(255, 255, 255)'); probe.remove();
  const out = [];
  document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (bad.has(cs.backgroundColor)) out.push(`${el.tagName.toLowerCase()}#${el.id}.${[...el.classList].join('.')} ${cs.backgroundColor}`); });
  return [...new Set(out)].slice(0, 8);
};
for (const mode of ['dark', 'light']) for (const size of ['phone', 'computer']) {
  test(`Flow look (${mode}, ${size}): Inter, Flow colours on every page, no Classic theme colour anywhere`, async ({ page }) => {
    test.setTimeout(90000);
    await (size === 'phone' ? phone(page) : desk(page));
    const errors = await openApp(page);
    await page.evaluate(m => { Object.assign(S.cfg, { ui: 'flow', theme: m, darkTheme: 'ember', lightTheme: 'sand', motion: false, habits: true, goals: true, mx: true, wins: true, routines: true, plan: true, journal: true, inbox: true }); save(); applySettings(); goHome(); }, mode);
    const look = await page.evaluate(() => [getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g, ''), getComputedStyle(document.body).backgroundColor]);
    expect(look).toEqual(['Inter', mode === 'dark' ? 'rgb(14, 15, 18)' : 'rgb(246, 246, 247)']);
    for (const [name, go] of PAGES) {
      await page.evaluate(go);
      await page.waitForTimeout(120);
      expect(await page.evaluate(classicLeaks), `${name} (${mode}, ${size})`).toEqual([]);
    }
    // Settings: no Classic theme picker in Flow
    await page.evaluate(() => { setView = 'appearance'; drawSettings(); });
    await expect(page.locator('#setIn .th-fold')).toBeHidden();
    noErrors(errors);
  });
}

test('Flow look: buttons on the coral use dark ink (dark look); Classic keeps its white text', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await page.evaluate(() => { Object.assign(S.cfg, { ui: 'flow', theme: 'dark', motion: false }); save(); applySettings(); openSpace(S.spaces[0].id); S.stage = 'today'; render(); });
  expect(await page.evaluate(() => window.__flInkN)).toBeGreaterThan(5);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('goBtn')).color)).toBe('rgb(20, 16, 14)');
  await page.evaluate(() => { goHome(); });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#homeView .td-card')).backgroundColor)).toBe('rgb(24, 26, 31)'); // Aurora glass on the dark surface (0.315)
  await page.evaluate(() => { S.cfg.ui = 'classic'; applySettings(); openSpace(S.spaces[0].id); render(); });
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('goBtn')).color)).toBe('rgb(255, 255, 255)');
  noErrors(errors);
});

test('Flow list view (phone): task cards, one segmented stage control lined up with the page, a centred empty state', async ({ page }) => {
  await page.setViewportSize({ width: 572, height: 918 });
  const errors = await openApp(page);
  await page.evaluate(() => { Object.assign(S.cfg, { ui: 'flow', theme: 'dark', motion: false }); save(); applySettings(); openSpace(S.spaces[0].id); S.stage = 'week'; render(); });
  const st = await page.evaluate(() => { const r = document.querySelector('#list .row-in'), cs = getComputedStyle(r);
    return [cs.borderRadius, cs.backgroundColor, getComputedStyle(document.querySelector('#gauge .bar')).display]; });
  expect(st).toEqual(['18px', 'rgb(24, 26, 31)', 'none']);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#gauge .seg.on')).backgroundColor)).toBe('rgb(255, 184, 107)'); // the active stage is filled
  const g = await page.locator('#gauge').boundingBox(), l = await page.locator('#list').boundingBox();
  expect(Math.abs(g.x - l.x)).toBeLessThan(2);
  expect(Math.abs(g.width - l.width)).toBeLessThan(2);
  await page.evaluate(() => { const sp = S.spaces[0].id; S.tasks.forEach(t => { if (listOf(t.list).space === sp && t.stage === 'backlog') t.stage = 'week'; }); S.stage = 'backlog'; render(); });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#list > li.empty')).textAlign)).toBe('center');
  const e = await page.locator('#list > li.empty').boundingBox();
  expect(Math.abs(e.width - l.width)).toBeLessThan(2);
  // Classic: the list view is untouched
  await page.evaluate(() => { S.cfg.ui = 'classic'; applySettings(); S.stage = 'week'; render(); });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#gauge .bar')).display)).toBe('block');
  noErrors(errors);
});

test('Flow layout (computer): calmer page titles; each stage a panel, each task a card; Classic board unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const look = () => page.evaluate(() => { const c = document.querySelector('.board .col[data-s="week"]'), r = c.querySelector('.col-list .row-in'), h = c.querySelector('.col-h h2');
    return { panel: getComputedStyle(c).borderRadius, card: getComputedStyle(r).borderRadius, h2: getComputedStyle(h).fontSize }; });
  await page.evaluate(() => { Object.assign(S.cfg, { ui: 'classic', motion: false }); save(); applySettings(); openSpace(S.spaces[0].id); render(); });
  const classic = await look();
  await page.evaluate(() => { S.cfg.ui = 'flow'; applySettings(); render(); });
  expect(await look()).toEqual({ panel: '22px', card: '14px', h2: '20px' });
  expect(classic.panel).toBe('0px');
  expect(classic.h2).not.toBe('20px');
  await page.evaluate(() => { goHome(); openInbox(); });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#inboxPg .ib-h')).fontSize)).toBe('44px');
  noErrors(errors);
});

test('Flow pages (0.308): Wins, Routines, Journal, Habits and The climb use the Flow look; Classic keeps its own', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { Object.assign(S.cfg, { ui: 'flow', theme: 'dark', motion: false, habits: true, goals: true, wins: true, routines: true, journal: true });
    const now = Date.now(); S.habits = [{ id: 'h1', name: 'Water', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done: { [dkey(now)]: 1 }, created: now - 9 * DAY }];
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: S.spaces[0].id, why: '', due: '', created: now, view: 'climb', ms: [{ id: 'm0', t: 'A', done: true }, { id: 'm1', t: 'B', done: false }] }];
    S.wins = [{ id: 1, t: 'Ran 5k', at: now }]; const r = rtFromTpl(RT_TPL[2]); r.at = ''; S.routines = [r];
    S.journal = [{ id: 9, d: dkey(now), am: 'x', pm: 'y', mood: 4, en: [] }]; save(); applySettings(); });
  const bg = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const SURF = 'rgb(24, 26, 31)', CORAL = 'rgb(255, 138, 91)';
  await page.evaluate(() => openWins());
  expect(await bg('.wn-jar')).toBe(SURF);
  await page.evaluate(() => { closeWins(); openRoutines(); });
  expect(await bg('.rt-next')).toBe(SURF);
  expect(await page.evaluate(() => { const r = document.querySelector('.rt-start').getBoundingClientRect(), c = document.querySelector('.rt-next').getBoundingClientRect(); return r.width > c.width * .8; })).toBe(true);
  await page.evaluate(() => { closeRoutines(); openJournal(); });
  expect(await page.evaluate(() => [...document.querySelectorAll('.jr-card')].map(c => getComputedStyle(c).backgroundColor))).toEqual(['rgb(24, 26, 31)', 'rgb(24, 26, 31)']);
  expect(await bg('.jr-mood.on')).toBe(CORAL);
  await page.evaluate(() => { closeJournal(); openRhythm(); });
  expect(await bg('#rhythmPg .hg-c.on')).toBe(CORAL);
  await page.evaluate(() => { S.habits = []; save(); drawRhythm(); });
  await expect(page.locator('#rhythmPg .hb-sun')).toBeVisible();                   // 0.316: the sun is the icon of the shared empty card
  await page.locator('#rhythmPg [data-flhb="Walk"]').click();
  await expect(page.locator('#hbSheet.on')).toBeVisible();
  await expect(page.locator('#hbName')).toHaveValue('Walk');
  await page.evaluate(() => { closeSheets(); closeRhythm(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gb-sun')).toBeHidden();
  // Classic: the warm jar is back
  await page.evaluate(() => { closeGoal(); S.cfg.ui = 'classic'; applySettings(); openWins(); });
  expect(await bg('.wn-jar')).not.toBe(SURF);
  noErrors(errors);
});

test('Flow hero is Aurora glass: calm surface, slow turning light, one row of actions, still in reduced motion; Classic untouched', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await todayTask(page);
  const classicBg = await page.locator('#homeView .td-card').evaluate(c => getComputedStyle(c, '::before').animationName);
  expect(classicBg).not.toBe('flAurora');
  await flow(page);
  const card = page.locator('#homeView .td-card');
  const st = await card.evaluate(c => ({ bg: getComputedStyle(c).backgroundColor, surf: getComputedStyle(document.body).getPropertyValue('--surface'),
    anim: getComputedStyle(c, '::before').animationName, blur: getComputedStyle(c, '::after').backdropFilter }));
  expect(st.anim).toBe('flAurora');
  expect(st.blur).toContain('blur');
  expect(st.bg).not.toBe('rgb(255, 138, 91)');                                         // no solid coral block anymore
  const tops = await page.locator('#homeView .fl-acts button').evaluateAll(b => b.map(x => Math.round(x.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);                                                   // Start · Done · Later on one row (390px)
  await expect(page.locator('#homeView .fl-sq').first()).toContainText('Done');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await card.evaluate(c => getComputedStyle(c, '::before').animationName)).toBe('none');
  await desk(page); await page.evaluate(() => goHome());
  await expect.poll(() => page.locator('#dHome .cm-up').evaluate(c => getComputedStyle(c, '::before').animationName)).toBe('none'); // wait for the computer Home to draw
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.locator('#dHome .cm-up').evaluate(c => getComputedStyle(c, '::before').animationName)).toBe('flAurora');
  noErrors(errors);
});
