// Usage: PW_CHROMIUM=<chrome> node tools/qa-monkey.mjs <combo> <taps> <seed>  (random taps, skips Delete/Archive/Reset/Clear; prints JS errors with the last taps)
// Monkey test: random taps on visible buttons in the page in front; logs any JS error with the last actions.
// node monkey.mjs <combo e.g. m-classic-dark> <clicks> <seed>
import { chromium } from 'playwright';
import { FAKE_SUPABASE } from '../tests/helpers.mjs';
const [combo, N = '300', seed = '1'] = process.argv.slice(2);
const [dev, ui, th] = combo.split('-');
const W = { m: [390, 844], s: [360, 740], d: [1400, 900], n: [1100, 780] }[dev];
const phone = dev === 'm' || dev === 's';
let r = +seed; const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
const ctx = await b.newContext({ viewport: { width: W[0], height: W[1] }, colorScheme: th, hasTouch: phone, isMobile: phone, reducedMotion: 'reduce' });
const p = await ctx.newPage(); const errs = []; const trail = [];
p.on('pageerror', e => errs.push({ e: String(e.stack || e).slice(0, 600), trail: trail.slice(-6) }));
p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|net::/.test(m.text())) errs.push({ e: 'CONSOLE ' + m.text().slice(0, 300), trail: trail.slice(-6) }) });
await p.addInitScript(FAKE_SUPABASE);
await p.addInitScript(() => { window.__noFile = true; HTMLInputElement.prototype.click = function () { if (this.type === 'file') return; return HTMLElement.prototype.click.call(this) } });
await p.goto('http://localhost:4173/index.html'); await p.waitForTimeout(1200);
await p.evaluate(([ui]) => { Object.assign(S.cfg, { ui, habits: true, goals: true, vision: true, journal: true, plan: true, routines: true, wins: true, inbox: true, mx: true, funnel: true, closeDay: true, review: true }); try { fnFromTpl(FN_TPL[0]) } catch (e) { } save(); applySettings(); goHome(); }, [ui]);
const BAD = /delete|reset|sign ?(in|out)|log ?out|clear|archive|remove|download|import|restore|backup|copy|export|paste|install|update now|reload|start fresh|leave|unlink|merge/i;
for (let i = 0; i < +N; i++) {
  const cands = await p.evaluate((BADs) => {
    const BAD = new RegExp(BADs, 'i'); const vw = innerWidth, vh = innerHeight;
    let front = document.body; const el0 = document.elementFromPoint(vw / 2, vh / 2);
    for (let a = el0; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.position === 'fixed') { const rr = a.getBoundingClientRect(); if (rr.width * rr.height > vw * vh * .5) front = a } }
    const out = [];
    const sel = 'button,[role=button],a[href^="#"],input[type=checkbox],.row,.chip,.opt,[data-p],[data-tab]';
    const pool = [...front.querySelectorAll(sel), ...document.querySelectorAll('#tabBar button,.cx-pop.on button,#topPop.on button,#modesPop.on button,.dlg.on button')];
    for (const el of pool) {
      const rr = el.getBoundingClientRect(); if (rr.width < 4 || rr.height < 4) continue;
      const cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2; if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
      const h = document.elementFromPoint(cx, cy); if (!h || !(el.contains(h) || h.contains(el))) continue;
      if (el.disabled) continue;
      const label = ((el.getAttribute('aria-label') || '') + ' ' + (el.innerText || '')).trim().replace(/\s+/g, ' ').slice(0, 50);
      if (BAD.test(label) || BAD.test(el.id || '')) continue;
      out.push({ x: cx, y: cy, label: (el.id ? '#' + el.id + ' ' : '') + label });
    }
    return out;
  }, BAD.source);
  if (!cands.length) { await p.keyboard.press('Escape'); trail.push('Escape (nothing to tap)'); continue }
  const roll = rnd();
  if (roll < .06) { await p.keyboard.press('Escape'); trail.push('Escape'); }
  else if (roll < .09) { await p.evaluate(() => { try { goHome() } catch (e) { } }); trail.push('goHome'); }
  else if (roll < .13) { const f = await p.evaluate(() => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') }); if (f) { await p.keyboard.type('QA test ' + i); await p.keyboard.press('Enter'); trail.push('type+Enter') } }
  else {
    const c = cands[Math.floor(rnd() * cands.length)];
    trail.push(`${i}: tap "${c.label}"`);
    try { if (phone) await p.touchscreen.tap(c.x, c.y); else await p.mouse.click(c.x, c.y); } catch (e) { }
  }
  await p.waitForTimeout(140);
  // focus timer / dialogs can trap: occasionally reset to Home
  if (i % 60 === 59) { await p.keyboard.press('Escape'); await p.evaluate(() => { try { if (typeof F !== 'undefined' && F.on) document.getElementById('fClose').click(); closeSheets(); goHome() } catch (e) { } }); trail.push('— reset to Home —') }
}
const health = await p.evaluate(() => ({ tasks: S.tasks.length, ok: typeof render === 'function' && !!document.querySelector('#homeView,.app') }));
await b.close();
console.log(JSON.stringify({ combo, seed, errors: errs.length, health }));
for (const x of errs.slice(0, 8)) console.log('---\n' + x.e + '\n  after: ' + x.trail.join(' | '));
