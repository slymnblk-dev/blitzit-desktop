// Calm redraws: ticking something redraws the same screen without cards replaying their slide-in (no flash).
// Inbox badge: can be hidden from Settings.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

for (const [w, h] of [[390, 844], [1400, 900]]) {
  test(`ticking a habit on Home does not flash the page (${w}px)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page);
    await page.evaluate(() => { S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.hwStyle = 'pills'; const sp = S.spaces[0].id;
      S.habits = ['Move', 'Read'].map((n, i) => ({ id: 'h' + i, name: n, e: '', space: sp, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: Date.now() }));
      save(); render(); goHome(); });
    await page.waitForTimeout(1200);
    await page.locator('[data-hbt="h0"]:visible').first().click();
    const r = await page.evaluate(() => new Promise(res => { const el = () => [...document.querySelectorAll('.hw')].find(x => x.offsetParent); const first = el(); let min = 1; const t0 = performance.now();
      (function f() { const e = el(); if (e) min = Math.min(min, +getComputedStyle(e).opacity); if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res([min, e !== first]); })(); }));
    expect(r[1]).toBe(true); // it did redraw
    expect(r[0]).toBe(1);    // but never faded
    noErrors(errors);
  });
}

test('inbox badge on the phone tab can be hidden in Settings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.tasks.push({ id: 777, title: 'Loose', stage: 'week', inbox: true, est: 30, subs: [], notes: '', repeat: 'none' }); save(); render(); goHome(); });
  await expect(page.locator('#tbInbox .tb-n')).toBeVisible();
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await page.locator('#setIn [data-tg="ibBadge"]').click();
  await expect.poll(() => page.evaluate(() => S.cfg.ibBadge)).toBe(false);
  await page.evaluate(() => closeSettings());
  await expect(page.locator('#tbInbox .tb-n')).toHaveCount(0);
  noErrors(errors);
});
