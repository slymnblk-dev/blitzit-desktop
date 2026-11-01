// Settings → Tasks → Task details: Priorities, Impact and Tags are optional. Off = gone from the UI (rows, task details,
// search filters, list settings); the data stays and comes back on. Each card holds its own settings when on.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, detailsOn } from './helpers.mjs';

for (const [name, size] of [['phone', { width: 390, height: 844 }], ['computer', { width: 1400, height: 900 }]]) {
  test(`${name}: switching Priorities, Impact and Tags off hides them everywhere, on brings them back`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors = await openApp(page);
    await detailsOn(page);
    const id = await page.evaluate(() => { const t = S.tasks.find(x => x.stage === 'today'); t.pri = 'high'; t.imp = 5; t.tags = ['calls']; const l = listOf(t.list); l.tags = ['calls']; save(); openSpace(listOf(t.list).space); S.stage = 'today'; render(); return t.id; });
    const row = page.locator(`li.row[data-id="${id}"]`).locator('visible=true').first();
    await expect(row.locator('.mi.pri')).toHaveCount(1);
    await expect(row.locator('.mi.imp')).toHaveCount(1);
    await expect(row.locator('.ttag')).toHaveCount(1);
    // the settings: three cards with their own settings inside
    await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
    for (const k of ['pri', 'imp', 'tags']) await expect(page.locator(`#setIn .md-card[data-md="${k}"].on .md-body`)).toHaveCount(1);
    await expect(page.locator('#setIn .md-card[data-md="pri"] .prp')).toHaveCount(5);
    for (const k of ['pri', 'imp', 'tags']) { await page.locator(`#setIn .md-card[data-md="${k}"] [data-tg="${k}"]`).click(); await expect(page.locator(`#setIn .md-card[data-md="${k}"] .md-body`)).toHaveCount(0); }
    await page.evaluate(() => closeSettings());
    await expect(row.locator('.mi.pri, .mi.imp, .ttag, .pri-mk')).toHaveCount(0);
    await page.evaluate(id => openDetail(id), id);
    for (const k of ['pri', 'imp', 'tags']) await expect(page.locator(`#dPills .pill[data-p="${k}"]`)).toHaveCount(0);
    await page.evaluate(() => closeSheets());
    // search: no filter card when both are off
    await page.evaluate(() => { openSearch(); });
    await expect(page.locator('.sf-card')).toHaveCount(0);
    await page.evaluate(() => { closeSearch(); });
    // the data is still there, and comes back
    expect(await page.evaluate(id => { const t = S.tasks.find(x => x.id === id); return [t.pri, t.imp, t.tags.join()]; }, id)).toEqual(['high', 5, 'calls']);
    await page.evaluate(() => { ['pri', 'imp', 'tags'].forEach(k => setCfg(k, true)); });
    await expect(row.locator('.mi.pri')).toHaveCount(1);
    await expect(row.locator('.mi.imp')).toHaveCount(1);
    await expect(row.locator('.ttag')).toHaveCount(1);
    noErrors(errors);
  });
}

test('an old "Impact: Off" setting becomes the new Impact switch, off', async ({ page }) => {
  const errors = await openApp(page, { storage: JSON.stringify({ tasks: [], lists: [], spaces: [], cfg: { impStyle: 'off' }, onboarded: true }) });
  expect(await page.evaluate(() => [S.cfg.imp, S.cfg.impStyle, impOn()])).toEqual([false, 'levels', false]);
  noErrors(errors);
});

test('all three start off for everyone (once); a switch you turn on stays on after a reload', async ({ page }) => {
  // someone who had them on before this update
  const errors = await openApp(page, { storage: JSON.stringify({ tasks: [], lists: [], spaces: [], cfg: { pri: true, imp: true, tags: true }, onboarded: true }) });
  expect(await page.evaluate(() => [S.cfg.pri, S.cfg.imp, S.cfg.tags])).toEqual([false, false, false]);
  await page.evaluate(() => { setCfg('pri', true); setCfg('tags', true); });
  await page.reload();
  await page.waitForFunction(() => { try { return typeof S === 'object'; } catch { return false; } });
  expect(await page.evaluate(() => [S.cfg.pri, S.cfg.imp, S.cfg.tags])).toEqual([true, false, true]);
  noErrors(errors);
});
