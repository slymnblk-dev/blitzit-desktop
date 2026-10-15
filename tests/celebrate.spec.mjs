// Priority looks and celebrations (both chosen in Settings → Tasks).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('priority look: Label, Dot, Ring', async ({ page }) => {
  const errors = await openApp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await page.evaluate(() => { const l = S.lists.find(x => x.space === S.spaces[0].id); const t = newTask('Pri test', 'week', l.id, 15); t.pri = 'high'; S.tasks.unshift(t); S.space = S.spaces[0].id; S.list = 'all'; S.stage = 'week'; render(); return t.id; });
  const row = page.locator(`#list .row[data-id="${id}"]`);
  await expect(row.locator('.mi.pri.high')).toHaveCount(1);
  for (const [v, sel] of [['dot', '.pri-dt.high'], ['ring', null]]) {
    await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
    await page.locator(`.prp[data-v="${v}"]`).click();
    await page.evaluate(() => closeSettings());
    await expect(row.locator('.mi.pri')).toHaveCount(0);
    if (sel) await expect(row.locator(sel)).toHaveCount(1); else await expect(row).toHaveClass(/pr-high/);
  }
  noErrors(errors);
});

test('celebrations: off by default; every 3rd finished task shows one, with its sound', async ({ page }) => {
  const errors = await openApp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { window.__sfxLog = []; S.tasks.forEach(t => { if (t.doneAt) t.doneAt = Date.now() - 3 * 864e5 });
    const l = S.lists.find(x => x.space === S.spaces[0].id); for (let i = 0; i < 4; i++) S.tasks.unshift(newTask('C' + i, 'week', l.id, 15));
    S.space = S.spaces[0].id; S.list = 'all'; S.stage = 'week'; render(); });
  expect(await page.evaluate(() => S.cfg.celebrate)).toBe(false);
  await page.locator('#list .row .check').first().click();
  await page.waitForTimeout(1000);
  await expect(page.locator('#celeb')).toHaveCount(0);
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await page.locator('[data-tg="celebrate"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-celeb="count"]').click();                         // preview + pick
  await expect(page.locator('#celeb.c-count')).toHaveCount(1);
  await page.evaluate(() => { closeSettings(); document.getElementById('celeb')?.remove(); __sfxLog.length = 0; });
  for (let i = 0; i < 2; i++) { await page.locator('#list .row .check').first().click(); await page.waitForTimeout(900); }
  await expect(page.locator('#celeb.c-count')).toHaveCount(1);                // 3rd of today
  await expect(page.locator('#celeb .cb-count b')).toHaveText('3');
  expect(await page.evaluate(() => __sfxLog)).toContain('celeb:count');
  await page.waitForTimeout(2300);
  await expect(page.locator('#celeb')).toHaveCount(0);                        // goes away by itself
  noErrors(errors);
});
