// Modes → Habits: off by default and invisible; when on, habits live on their own page (like Inbox);
// week grid (default) or Sunrise view; days tick in one tap; evening check-in, Home widget; turning it off hides everything but keeps data.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const addHabit = async (page, name) => {
  await page.evaluate(() => openHabit(null));
  await expect(page.locator('#hbSheet')).toHaveClass(/on/);
  await page.fill('#hbName', name);
  await page.locator('#hbSave').click();
  await expect(page.locator('#hbSheet')).not.toHaveClass(/on/);
};

test('habits: off by default, turn on in Modes, add, Habits page, tick, turn off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  // off: nothing shows anywhere
  expect(await page.evaluate(() => habitsOn())).toBe(false);
  await page.evaluate(() => openSpace(S.spaces[0].id));
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

  // Home gets a Habits row; the Habits page lists it; one tap ticks it
  await page.evaluate(() => goHome());
  await page.locator('#rhEntry').click();
  await expect(page.locator('#rhythmPg')).toHaveClass(/on/);
  await expect(page.locator('#rhythmPg .hg-row')).toHaveCount(1);
  await page.locator('#rhythmPg .hg-c.now').click();
  expect(await page.evaluate(() => !!S.habits[0].done[today()])).toBe(true);
  await expect(page.locator('#rhythmPg .hg-c.now')).toHaveClass(/on/);
  // Sunrise view from ⋯ → View
  await page.locator('#hpMore').click();
  await page.locator('#hpPop [data-hpv="sun"]').click();
  await expect(page.locator('#rhythmPg .hs-chip')).toHaveCount(1);
  await page.locator('#rhythmPg .hs-chip').click();
  expect(await page.evaluate(() => !!S.habits[0].done[today()])).toBe(false);
  await page.evaluate(() => setCfg('hbView', 'grid'));
  // spaces stay plain: no switch inside them
  await page.evaluate(() => { closeRhythm(); openSpace(S.habits[0].space); });
  await expect(page.locator('#hero')).toBeVisible();

  // off again: gone everywhere, data kept
  await page.evaluate(() => { setCfg('habits', false); goHome(); });
  await expect(page.locator('#rhEntry')).toHaveCount(0);
  expect(await page.evaluate(() => S.habits.length)).toBe(1);
  noErrors(errors);
});

test('habits: Habits page, evening check-in, Home widget', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.hbCiAt = 0; save(); applySettings(); goHome(); });
  await page.locator('#rhEntry').click();
  await expect(page.locator('#rhythmPg')).toHaveClass(/on/);
  await addHabit(page, 'Read 20 pages');
  await addHabit(page, 'Meditate');
  await expect(page.locator('#rhythmPg .hg-row')).toHaveCount(2);
  // check-in: Done on the first, Not today on the second
  await page.locator('#hpMore').click();
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
  await expect(page.locator('.app .hw-one .hw-done')).toHaveCount(1); // phone default: one at a time
  await expect(page.locator('.app .ci-home')).toHaveCount(0);
  await page.locator('.app .hw-done').click();
  expect(await page.evaluate(() => S.habits.filter(h => h.done[today()]).length)).toBe(2);
  noErrors(errors);
});

test('habits on a computer: sidebar Habits page, week grid, week navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; const sp = S.spaces[0].id; S.habits = [{ id: 'h1', name: 'Walk', e: '🚶', space: sp, days: [0,1,2,3,4,5,6], done: {}, created: Date.now() - 30 * DAY }]; save(); applySettings(); goHome(); });
  await page.locator('#sRhythm').click();
  await expect(page.locator('#rhythmPg .hg-row')).toHaveCount(1);
  await page.evaluate(() => { setCfg('wHabits', true); closeRhythm(); goHome(); });
  await expect(page.locator('#dHome .hw-tiles .hw-tile')).toHaveCount(1); // computer default: big tiles
  await page.locator('#dHome .hw-tile').click();
  await expect(page.locator('#dHome .hw-tile')).toHaveClass(/on/);
  await page.locator('#sRhythm').click();
  // last week is one tap away; next week can't be opened from this week
  await page.locator('[data-hpw="-1"]').click();
  await expect(page.locator('#rhythmPg .hp-h')).toHaveText('Last week');
  await page.locator('[data-hpw="1"]').click();
  await expect(page.locator('#rhythmPg [data-hpw="1"]')).toBeDisabled();
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
