// Priority looks and celebrations (both chosen in Settings → Tasks).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('priority look: Label, Dot, Ring', async ({ page }) => {
  const errors = await openApp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await page.evaluate(() => { const l = S.lists.find(x => x.space === S.spaces[0].id); const t = newTask('Pri test', 'week', l.id, 15); t.pri = 'high'; S.tasks.unshift(t); S.space = S.spaces[0].id; S.list = 'all'; S.stage = 'week'; render(); return t.id; });
  const row = page.locator(`#list .row[data-id="${id}"]`);
  await expect(row.locator('.mi.pri.high')).toHaveCount(1);
  for (const [v, sel] of [['marks', '.pri-mk.high'], ['ring', null]]) {
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

test('priority sort: High, Medium, Low, then the rest; a drag against it explains why', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const ids = await page.evaluate(() => { const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id);
    S.tasks = S.tasks.filter(t => !(listOf(t.list).space === sp.id && t.stage === 'week'));
    const mk = (n, p) => { const t = newTask(n, 'week', l.id, 15); if (p) t.pri = p; S.tasks.push(t); return t.id; };
    const r = { none: mk('Plain'), low: mk('Low one', 'low'), high: mk('High one', 'high'), med: mk('Med one', 'med') };
    openSpaceSide(sp.id); return r; });
  const col = page.locator('.col[data-s="week"]');
  const order = async () => col.locator('.row').evaluateAll(rs => rs.map(r => +r.dataset.id));
  expect(await order()).toEqual([ids.high, ids.med, ids.low, ids.none]);
  // drag the plain task to the very top: it goes back below Low, and a hint explains
  const plain = col.locator(`.row[data-id="${ids.none}"] .row-in`), top = col.locator(`.row[data-id="${ids.high}"]`);
  await plain.hover(); await page.mouse.down();
  const tb = await top.boundingBox();
  await page.mouse.move(tb.x + 40, tb.y + 4, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await order()).toEqual([ids.high, ids.med, ids.low, ids.none]);
  await expect(page.locator('#toastMsg')).toContainText('Sorted by priority');
  // turn it off: manual order wins
  await page.evaluate(() => { S.cfg.priSort = false; render(); });
  expect((await order())[0]).not.toBe(ids.high);
  noErrors(errors);
});
