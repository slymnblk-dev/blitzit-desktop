// Usage: (node tests/server.mjs &) then PW_CHROMIUM=<chrome> node tools/qa-crawl.mjs <outdir> [combos e.g. m-classic-dark,d-flow-light] [demo|long|empty]; read <outdir>/summary.txt. Devices: m 390, s 360, d 1400, n 1100, t 820 tablet, l landscape. CONTRAST=1 adds a contrast scan (see tools/flow-audit.mjs).
// QA crawler: opens every page in phone/computer x Classic/Flow x light/dark and checks the page in front for
// errors, content spilling off-screen, buttons covered by something else, small tap targets (phone), clipped text.
// node crawl.mjs <outdir> [onlyCombo]   (needs tests/server.mjs on :4173)
import { chromium } from 'playwright';
import fs from 'fs';
import { FAKE_SUPABASE } from '../tests/helpers.mjs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const only = process.argv[3] || '';
const DATA = process.argv[4] || 'demo'; // demo | long | empty
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
const DEV = [['m', 390, 844], ['s', 360, 740], ['d', 1400, 900], ['n', 1100, 780], ['t', 820, 1180], ['l', 844, 390]];
const SETV = ['main', 'appearance', 'stages', 'tasks', 'focus', 'modes', 'lists', 'shortcuts', 'data'];
const prep = () => { try { closeSheets() } catch (e) { } try { if (typeof closeSettings === 'function') closeSettings() } catch (e) { } };
const V = [
  ['home', () => { goHome(); render() }],
  ...['backlog', 'week', 'today', 'done'].map(st => ['space-' + st, a => { const s = S.spaces[0]; openSpace(s.id); S.stage = a; render() }, st]),
  ['add', () => { goHome(); document.getElementById('addBtn').click() }],
  ['detail', () => { const s = S.spaces[0]; openSpace(s.id); openDetail(S.tasks.find(t => t.stage !== 'done' && !t.inbox).id) }],
  ['detail-pick', () => { const s = S.spaces[0]; openSpace(s.id); openDetail(S.tasks.find(t => t.stage !== 'done' && !t.inbox).id); const p = document.querySelector('#dPills [data-p="pri"]'); p && p.click() }],
  ['search', () => { goHome(); openSearch() }],
  ...SETV.map(v => ['set-' + v, a => { openSettings(); setView = a; drawSettings(); const g = document.querySelector('#setIn [data-btgrp]'); if (a === 'modes' && g && g.getAttribute('aria-expanded') !== 'true') g.click() }, v]),
  ['you', () => { goHome(); openYou() }],
  ['inbox', () => { goHome(); openInbox() }],
  ['habits', () => { goHome(); openRhythm() }],
  ['goals', () => { goHome(); openGoals() }],
  ['goal', () => { goHome(); const g = (S.goals || [])[0]; if (g) openGoal(g.id); else openGoals() }],
  ['metrics', () => { goHome(); openMetrics() }],
  ['wins', () => { goHome(); openWins() }],
  ['routines', () => { goHome(); openRoutines() }],
  ['plan', () => { goHome(); openPlan() }],
  ['journal', () => { goHome(); openJournal() }],
  ['vision', () => { goHome(); openVision() }],
  ['funnel', () => { goHome(); openFunnel() }],
  ['focus', () => { goHome(); S.cfg.focusStyle = 'classic'; startBlitz([S.tasks.find(t => t.stage === 'today' && !t.inbox)]) }],
  ['tide', () => { goHome(); S.cfg.focusStyle = 'tide'; startBlitz([S.tasks.find(t => t.stage === 'today' && !t.inbox)]) }],
  ['review', () => { goHome(); openReview() }],
  ['closeday', () => { goHome(); openCloseDay() }],
];
const CHECK = (dev) => {
  const vw = innerWidth, vh = innerHeight, res = { off: [], cover: [], small: [], clip: [], docOver: 0 };
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') return false; for (let a = el; a; a = a.parentElement) { const c = getComputedStyle(a); if (+c.opacity === 0 || c.visibility === 'hidden') return false } return true };
  const name = el => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; const c = [...el.classList].slice(0, 2).join('.'); if (c) s += '.' + c; const p = el.parentElement; let ps = ''; if (p) { ps = p.tagName.toLowerCase() + (p.id ? '#' + p.id : '') + (p.classList[0] ? '.' + p.classList[0] : '') } return ps + ' > ' + s };
  const txt = el => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  // the page in front: a fixed container covering most of the screen at its centre, else the body
  let front = document.body;
  { let el = document.elementFromPoint(vw / 2, vh / 2); for (let a = el; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.position === 'fixed') { const r = a.getBoundingClientRect(); if (r.width * r.height > vw * vh * .6) { front = a; } } } }
  res.front = front === document.body ? 'body' : name(front);
  const se = document.scrollingElement; res.docOver = Math.max(0, se.scrollWidth - vw);
  const els = [...front.querySelectorAll('*')].filter(vis);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    // spilling off the sides (unless an ancestor clips it inside the screen)
    if (r.right > vw + 2 || r.left < -2) {
      let clipped = false; for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const c = getComputedStyle(a); if (c.overflowX !== 'visible' || c.overflow === 'hidden' || c.clipPath !== 'none') { const ar = a.getBoundingClientRect(); if (ar.right <= vw + 2 && ar.left >= -2) { clipped = true; break } } }
      if (!clipped && (el.children.length === 0 || el.innerText)) res.off.push(`${name(el)} [${Math.round(r.left)}..${Math.round(r.right)}] "${txt(el)}"`);
    }
    const tag = el.tagName, act = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.getAttribute('role') === 'button';
    if (act && !el.disabled) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx > 0 && cx < vw && cy > 0 && cy < vh) {
        const h = document.elementFromPoint(cx, cy);
        if (h && !el.contains(h) && !h.contains(el)) {
          const bar = h.closest('#tabBar,.tab-bar,#toast,.toast,#remCard,.sb-fab,#nwFab,.nw-fab');
          if (!bar && front.contains(h)) res.cover.push(`${name(el)} "${txt(el)}" under ${name(h)}`);
        }
      }
      if ((dev === 'm' || dev === 's' || dev === 't' || dev === 'l') && tag !== 'INPUT' && tag !== 'TEXTAREA' && Math.min(r.width, r.height) < 28 && cx > 0 && cx < vw && cy > 0 && cy < vh) res.small.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${txt(el)}"`);
    }
    // text cut off without an ellipsis
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own) { const c = getComputedStyle(el); if ((c.overflow === 'hidden' || c.overflowX === 'hidden') && c.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && c.webkitLineClamp === 'none') res.clip.push(`${name(el)} ${el.scrollWidth}>${el.clientWidth} "${txt(el)}"`); }
  }
  for (const k of ['off', 'cover', 'small', 'clip']) res[k] = [...new Set(res[k])].slice(0, 25);
  return res;
};
const SCAN = '()=>{const P=s=>{const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const a=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);return {r:a[0],g:a[1],b:a[2],a:a[3]===undefined?1:a[3]}};\n const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};\n const mix=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});\n const bgOf=el=>{const st=[];for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!==\'none\'){const c=P(cs.backgroundImage);if(c){st.push({...c,a:1});break}}const c=P(cs.backgroundColor);if(c&&c.a>0){st.push(c);if(c.a>=1)break}}\n   let out=P(getComputedStyle(document.body).backgroundColor)||{r:0,g:0,b:0,a:1};for(let i=st.length-1;i>=0;i--)out=mix(st[i],out);return out};\n const res=[];document.querySelectorAll(\'body *\').forEach(el=>{if(!el.childNodes.length)return;const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;\n  const r=el.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;const cs=getComputedStyle(el);\n  if(cs.visibility===\'hidden\'||+cs.opacity===0)return;let o=1;for(let e=el;e;e=e.parentElement){o*=+getComputedStyle(e).opacity}if(o<.5)return;\n  if(el.closest(\'[aria-hidden="true"],button:disabled,[disabled]\'))return;\n  const fg=P(cs.color);if(!fg)return;const bg=bgOf(el),f=mix(fg,bg);const l1=L(f),l2=L(bg),cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);\n  const big=parseFloat(cs.fontSize)>=18.6||(parseFloat(cs.fontSize)>=14&&+cs.fontWeight>=700);\n  if(cr<(big?3:4.5))res.push(`${cr.toFixed(2)} ${el.tagName.toLowerCase()}${el.id?\'#\'+el.id:\'\'}.${[...el.classList].slice(0,2).join(\'.\')} "${el.textContent.trim().slice(0,24)}" fg=${cs.color} bg=rgb(${bg.r|0},${bg.g|0},${bg.b|0})`)});\n const ff=getComputedStyle(document.body).fontFamily;return {ff:ff.slice(0,10),res:[...new Set(res)]}}';
const report = {};
for (const [dev, w, h] of DEV) for (const ui of ['classic', 'flow']) for (const th of ['dark', 'light']) {
  const combo = `${dev}-${ui}-${th}`; if (only && !only.split(',').some(o => combo.startsWith(o))) continue;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', colorScheme: th, hasTouch: 'mstl'.includes(dev), isMobile: 'msl'.includes(dev) });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)) });
  await p.addInitScript(FAKE_SUPABASE);
  await p.goto('http://localhost:4173/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(([ui, th, D]) => {
    Object.assign(S.cfg, { ui, habits: true, goals: true, vision: true, journal: true, plan: true, routines: true, wins: true, inbox: true, mx: true, funnel: true, closeDay: true, review: true });
    try { S.cfg.theme = th } catch (e) { }
    if (!(S.routines || []).length && typeof rtFromTpl === 'function') S.routines = [rtFromTpl(RT_TPL[0])];
    if (typeof fnFromTpl === 'function' && !(S.cfg.fn && S.cfg.fn.steps && S.cfg.fn.steps.length)) fnFromTpl(FN_TPL[0]);
    if (!(S.goals || []).length && typeof gPlus === 'function') S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '🏃', space: null, why: 'Feel strong', due: gPlus(40), created: Date.now(), ms: [{ id: 'm1', t: '10 km', done: true, doneAt: Date.now() }, { id: 'm2', t: '21 km', done: false }] }];
    if (D === 'long') {
      const L = 'Prepare the quarterly investor update with revenue numbers and hiring plan for Q1 2027';
      S.spaces[0].name = 'Client work and partnerships international'; (S.lists || []).forEach((l, i) => { if (i < 3) l.name = 'Supercalifragilistic project list ' + i });
      S.tasks.slice(0, 8).forEach((t, i) => { t.title = i % 2 ? L : 'Antidisestablishmentarianismverylongwordwithoutanyspaces' + i; t.subs = [{ id: 1, t: L, done: false }] });
      (S.goals || []).forEach(g => g.name = 'Become fluent in Japanese and pass the JLPT N2 exam in December');
      (S.habits || []).forEach(h => h.name = 'Meditate for twenty minutes before breakfast every single day');
    }
    if (D === 'empty') { S.tasks = []; S.goals = []; S.habits = []; S.routines = []; S.journal = []; S.wins = []; S.kpis = []; S.okrs = []; S.vision = []; S.blocks = []; S.demoOn = false; S.cfg.vSeeded = true }
    save(); applySettings(); goHome();
  }, [ui, th, DATA]);
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  report[combo] = {};
  for (const [n, f, arg] of V) {
    const before = errs.length;
    try {
      await p.keyboard.press('Escape').catch(() => { });
      await p.evaluate(prep);
      await p.evaluate(`(${f.toString()})(${JSON.stringify(arg ?? null)})`);
      await p.waitForTimeout(350);
      const r = await p.evaluate(`(${CHECK.toString()})(${JSON.stringify(dev)})`);
      r.errs = errs.slice(before);
      if (process.env.CONTRAST) { const cr = await p.evaluate(`(${SCAN})()`); r.contrast = cr.res.slice(0, 20); }
      report[combo][n] = r;
      await p.screenshot({ path: `${out}/${combo}-${n}.png` });
      // leave focus/tide/review overlays
      await p.evaluate(() => { try { if (typeof F !== 'undefined' && F.on) { const x = document.getElementById('fClose'); x && x.click() } } catch (e) { } });
    } catch (e) { report[combo][n] = { fail: String(e).slice(0, 300), errs: errs.slice(before) } }
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
// summary
let sum = '';
for (const [c, vs] of Object.entries(report)) for (const [n, r] of Object.entries(vs)) {
  const bits = [];
  if (r.fail) bits.push('FAIL ' + r.fail);
  if (r.errs && r.errs.length) bits.push('ERR ' + r.errs.join(' | '));
  if (r.docOver) bits.push('DOC-OVERFLOW ' + r.docOver);
  if (r.contrast && r.contrast.length) bits.push('CONTRAST(' + r.contrast.length + ') ' + r.contrast.join(' ; '));
  for (const k of ['off', 'cover', 'clip', 'small']) if (process.env.CONTRAST) break; else if (r[k] && r[k].length) bits.push(`${k.toUpperCase()}(${r[k].length}) ` + r[k].slice(0, 6).join(' ; '));
  if (bits.length) sum += `== ${c} ${n} [front ${r.front || '?'}]\n  ` + bits.join('\n  ') + '\n';
}
fs.writeFileSync(`${out}/summary.txt`, sum);
console.log('done', Object.keys(report).length, 'combos');
