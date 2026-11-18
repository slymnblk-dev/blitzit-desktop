// 0.327: one rule for full pages (regPage / pagesWire): opening any page closes the others.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

for (const [dev, w, h] of [['phone', 390, 844], ['computer', 1400, 900]]) {
  test(`${dev}: from any page to any other, exactly one page is open (incl. Goals → Inbox)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page);
    const bad = await page.evaluate(() => {
      Object.assign(S.cfg, { habits: true, goals: true, vision: true, journal: true, plan: true, routines: true, wins: true, inbox: true, mx: true, funnel: true }); save(); applySettings(); render();
      const P = { inbox: ['openInbox', () => ibOn], metrics: ['openMetrics', () => mtOn], wins: ['openWins', () => wnOn], routines: ['openRoutines', () => rtOn], plan: ['openPlan', () => pnOn], journal: ['openJournal', () => jrOn], vision: ['openVision', () => vbOn], goals: ['openGoals', () => glOn], habits: ['openRhythm', () => rhOn], funnel: ['openFunnel', () => fnOn] };
      const out = [];
      for (const a in P) for (const c in P) { if (a === c) continue; goHome(); window[P[a][0]](); window[P[c][0]]();
        const on = Object.keys(P).filter(k => P[k][1]()); if (on.join() !== c) out.push(`${a}→${c}: ${on}`); }
      goHome(); const left = Object.keys(P).filter(k => P[k][1]()); if (left.length) out.push('goHome left: ' + left);
      return out;
    });
    expect(bad).toEqual([]);
    expect(await page.evaluate(() => pgList().map(p => p.name).sort())).toEqual(['funnel', 'goals', 'habits', 'inbox', 'journal', 'metrics', 'plan', 'routines', 'vision', 'wins']);
    noErrors(errors);
  });
}
