// Modes → Habits: off by default and invisible; when on, habits live in spaces (lens) or on the Rhythm page;
// sunrise rows tick in one tap; chains, evening check-in, Home widget; turning it off hides everything but keeps data.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const addHabit = async (page, name) => {
  await page.locator('[data-hbnew]').first().click();
  await expect(page.locator('#hbSheet')).toHaveClass(/on/);
  await page.fill('#hbName', name);
  await page.locator('#hbSave').click();
  await expect(page.locator('#hbSheet')).not.toHaveClass(/on/);
};

test('habits: off by default, turn on in Modes, add, lens in a space, tick, turn off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  // off: nothing shows anywhere
  expect(await page.evaluate(() => habitsOn())).toBe(false);
  await page.evaluate(() => openSpace(S.spaces[0].id));
  await expect(page.locator('#mLens')).toBeHidden();
  await page.evaluate(() => goHome());
  await expect(page.locator('#rhEntry')).toHaveCount(0);

  // turn on in Settings → Modes
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-tg="habits"]').click();
  await expect.poll(() => page.evaluate(() => habitsOn())).toBe(true);
  await page.locator('#setIn [data-page="habits"]').click();
  await addHabit(page, 'Drink water');
  await expect(page.locator('#setIn [data-hbe]')).toHaveCount(1);
  expect(await page.evaluate(() => S.habits[0].e)).toBe('💧'); // auto icon from the name
  await page.evaluate(() => closeSettings());

  // the habit's space now shows Board · Habits; other spaces don't
  const sp = await page.evaluate(() => S.habits[0].space);
  await page.evaluate(sp => openSpace(sp), sp);
  await expect(page.locator('#mLens')).toBeVisible();
  await page.locator('#mLens [data-lens="habits"]').click();
  await expect(page.locator('#hbView .hb-row')).toHaveCount(1);
  await expect(page.locator('#hero')).toBeHidden();
  await page.locator('#hbView .hb-row').click();
  expect(await page.evaluate(() => !!S.habits[0].done[today()])).toBe(true);
  await expect(page.locator('#hbView .hb-row')).toHaveClass(/on/);
  const other = await page.evaluate(sp => S.spaces.find(x => x.id !== sp).id, sp);
  await page.evaluate(o => openSpace(o), other);
  await expect(page.locator('#mLens')).toBeHidden();

  // off again: gone everywhere, data kept
  await page.evaluate(sp => { openSpace(sp); setCfg('habits', false); }, sp);
  await expect(page.locator('#mLens')).toBeHidden();
  await expect(page.locator('#hbView')).toBeHidden();
  await expect(page.locator('#hero')).toBeVisible();
  expect(await page.evaluate(() => S.habits.length)).toBe(1);
  noErrors(errors);
});

test('habits: Rhythm page, chains, evening check-in, Home widget', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.modePlace = 'page'; S.cfg.hbChains = true; S.cfg.wHabits = true; S.cfg.hbCiAt = 0; save(); applySettings(); goHome(); });
  await page.locator('#rhEntry').click();
  await expect(page.locator('#rhythmPg')).toHaveClass(/on/);
  await addHabit(page, 'Read 20 pages');
  await addHabit(page, 'Meditate');
  await expect(page.locator('#rhythmPg .hb-row')).toHaveCount(2);
  // put both in a new chain from the editor
  for (const n of [0, 1]) {
    await page.evaluate(i => openHabit(S.habits[i].id), n);
    await page.locator('#hbOpts [data-lxt="c"]').click();
    if (n === 0) { await page.fill('#hbChName', 'Morning'); await page.locator('#hbChAdd').click(); }
    else await page.locator('#hbOpts [data-hbch]').nth(1).click();
    await page.locator('#hbSave').click();
  }
  await expect(page.locator('#rhythmPg .hc-card')).toHaveCount(1);
  await expect(page.locator('#rhythmPg .hc-node')).toHaveCount(2);
  // check-in: Done on the first, Not today on the second
  await page.locator('#rhythmPg [data-ciopen]').click();
  await expect(page.locator('#ciPg')).toHaveClass(/on/);
  await page.locator('#ciPg [data-ciyes]').click();
  await page.waitForTimeout(350);
  await page.locator('#ciPg [data-cino]').click();
  await expect(page.locator('#ciPg .ci-end')).toBeVisible();
  expect(await page.evaluate(() => S.habits.filter(h => h.done[today()]).length)).toBe(1);
  await page.locator('#ciPg [data-ciclose]').click();
  // Home: widget with suns; the check-in card is gone for today once you checked in
  await page.locator('#rhBack').click();
  await expect(page.locator('.app .hbwid-s')).toHaveCount(2);
  await expect(page.locator('.app .ci-home')).toHaveCount(0);
  await page.locator('.app .hbwid-s').nth(1).click();
  expect(await page.evaluate(() => S.habits.filter(h => h.done[today()]).length)).toBe(2);
  noErrors(errors);
});

test('habits on a computer: lens in the header, wide view with the year fabric, sidebar Rhythm', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; const sp = S.spaces[0].id; S.habits = [{ id: 'h1', name: 'Walk', e: '🚶', space: sp, days: [0,1,2,3,4,5,6], done: {}, created: Date.now() - 30 * DAY }]; save(); applySettings(); openSpace(sp); });
  await expect(page.locator('#dLens')).toBeVisible();
  await page.locator('#dLens [data-lens="habits"]').click();
  await expect(page.locator('#hbDesk')).toBeVisible();
  await expect(page.locator('#board')).toBeHidden();
  await expect(page.locator('#hbDesk .fab-row')).toHaveCount(1);
  await page.evaluate(() => setCfg('modePlace', 'page'));
  await expect(page.locator('#dLens')).toBeHidden();
  await page.evaluate(() => goHome());
  await page.locator('#sRhythm').click();
  await expect(page.locator('#rhythmPg .hb-row')).toHaveCount(1);
  noErrors(errors);
});

test('habits sync, back up and undo like tasks', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const sp = S.spaces[0].id, a = { id: 'hA', name: 'A', space: sp, days: [0,1,2,3,4,5,6], done: {}, u: 5 }, b = { id: 'hB', name: 'B', space: sp, days: [0,1,2,3,4,5,6], done: {}, u: 6 };
    const m = mergeDocs({ ...localDoc(), habits: [a], hchains: [] }, { ...localDoc(), habits: [{ ...a, name: 'A2', u: 9 }, b], hchains: [] });
    const merged = m.habits.map(h => h.name).sort().join(',');
    S.cfg.habits = true; S.habits = [{ id: 'hC', name: 'C', space: sp, days: [0,1,2,3,4,5,6], done: {}, created: Date.now() }]; save();
    const inBackup = JSON.parse(backupData()).habits.length;
    commit(() => { S.habits = []; }, 'Habit deleted');
    return { merged, inBackup, after: S.habits.length };
  });
  expect(r.merged).toBe('A2,B');
  expect(r.inBackup).toBe(1);
  expect(r.after).toBe(0);
  await page.locator('#undoBtn').click();
  expect(await page.evaluate(() => S.habits.length)).toBe(1);
  noErrors(errors);
});
