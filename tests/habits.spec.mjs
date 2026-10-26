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
  await expect(page.locator('#tbHabits')).toHaveCount(0);

  // turn on in Settings → Modes
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-tg="habits"]').click();
  await expect.poll(() => page.evaluate(() => habitsOn())).toBe(true);
  await page.locator('#setIn [data-page="habits"]').click();
  await addHabit(page, 'Drink water');
  await expect(page.locator('#setIn [data-hbe]')).toHaveCount(1);
  expect(await page.evaluate(() => S.habits[0].e)).toBe('💧'); // auto icon from the name
  await page.evaluate(() => closeSettings());

  // the tab bar gets Habits; the Habits page lists it; one tap ticks it
  await page.evaluate(() => goHome());
  await page.locator('#tbHabits').click();
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
  await page.evaluate(() => { closeRhythm(); openSpace(S.spaces[0].id); });
  await expect(page.locator('#hero')).toBeVisible();

  // off again: gone everywhere, data kept
  await page.evaluate(() => { setCfg('habits', false); goHome(); });
  await expect(page.locator('#tbHabits')).toHaveCount(0);
  expect(await page.evaluate(() => S.habits.length)).toBe(1);
  noErrors(errors);
});

test('habits: Habits page, evening check-in, Home widget', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.hbCiAt = 0; save(); applySettings(); goHome(); });
  await page.locator('#tbHabits').click();
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
  await expect(page.locator('#rhBack')).toBeHidden(); // phones: no Back on Habits, the Home tab goes back
  await page.locator('#tbHome').click();
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
  await expect(page.locator('#dHome .bn-hab .bn-hb')).toHaveCount(1); // computer Home: the Habits card
  await page.locator('#dHome .bn-hb').click();
  await expect(page.locator('#dHome .bn-hb')).toHaveClass(/on/);
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

test('habits on Home: one spot, widget shows up to 6, one nudge at a time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.hwStyle = 'tiles'; S.cfg.hbCiAt = 0; S.cfg.review = true; S.cfg.reviewedAt = 0;
    const sp = S.spaces[0].id;
    S.habits = Array.from({ length: 8 }, (_, i) => ({ id: 'h' + i, name: 'Habit ' + i, e: '', space: sp, days: [0,1,2,3,4,5,6], done: i < 2 ? { [today()]: 1 } : {}, created: Date.now() - 5 * DAY }));
    save(); applySettings(); goHome();
  });
  // tiles keep their own card; Habits is always one tap away in the tab bar
  await expect(page.locator('.app .hw-tiles')).toHaveCount(1);
  await expect(page.locator('.app .also .hw-tiles')).toHaveCount(0);
  await expect(page.locator('#tbHabits')).toBeVisible();
  // 6 tiles in your order; done ones stay visible (coral) and the rest fold into "+2 more"
  await expect(page.locator('.app .hw-tile')).toHaveCount(6);
  await expect(page.locator('.app .hw-tile.on')).toHaveCount(2);
  await expect(page.locator('.app .hw-more')).toHaveText('+2 more');
  await page.evaluate(() => { setCfg('hwStyle', 'pills'); goHome(); });
  await expect(page.locator('.app .hw-pill')).toHaveCount(6);
  await expect(page.locator('.app .hw-more')).toHaveText('+2 more');
  await page.evaluate(() => { S.habits.forEach(h => h.done[today()] = 1); save(); render(); });
  await expect(page.locator('.app .hw-pill.on')).toHaveCount(6);
  await page.evaluate(() => { S.habits.forEach(h => delete h.done[today()]); save(); render(); });
  // one at a time is a row in the "Also today" card
  await page.evaluate(() => { setCfg('hwStyle', 'one'); goHome(); });
  await expect(page.locator('.app .also .hw-one')).toHaveCount(1);
  await expect(page.locator('.app .hw-more')).toHaveCount(0);
  // never more than one nudge card: the check-in wins over the weekly review
  await page.evaluate(() => { reviewCard = () => '<div class="rv-card">Weekly review</div>'; backupCard = () => '<div class="bk-card">Backup</div>'; render(); });
  await expect(page.locator('.app .ci-home')).toHaveCount(1);
  await expect(page.locator('.app .rv-card, .app .bk-card')).toHaveCount(0);
  // after "Later" on the check-in, the review takes its turn
  await page.locator('.app [data-cilater]').click();
  await expect(page.locator('.app .ci-home')).toHaveCount(0);
  await expect(page.locator('.app .rv-card')).toHaveCount(1);
  await expect(page.locator('.app .bk-card')).toHaveCount(0);
  // without the widget, Home has no habits card; the tab still opens them
  await page.evaluate(() => { setCfg('wHabits', false); goHome(); });
  await expect(page.locator('.app .hw')).toHaveCount(0);
  await page.locator('#tbHabits').click();
  await expect(page.locator('#rhythmPg')).toHaveClass(/on/);
  noErrors(errors);
});

test('habits page: double tap ticks once, Escape closes menu then page, Sunrise keeps order', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.hwStyle = 'tiles'; const sp = S.spaces[0].id;
    S.cfg.weekStart = new Date().getDay() === 1 ? 0 : 1; // the week grid always has a past day, whatever weekday the tests run on
    S.habits = ['Water', 'Read', 'Walk'].map((n, i) => ({ id: 'h' + i, name: n, e: '', space: sp, days: [0,1,2,3,4,5,6], done: {}, created: Date.now() - 30 * DAY }));
    save(); applySettings(); openRhythm(); });
  const done = () => page.evaluate(() => S.habits.map(h => !!h.done[today()]));
  // week grid, past day and Home tiles: a quick double tap ticks once
  await page.locator('#rhythmPg .hg-c.now').first().dblclick();
  expect(await done()).toEqual([true, false, false]);
  await page.locator('#rhythmPg .hg-row').nth(1).locator('.hg-c.miss').first().dblclick();
  expect(await page.evaluate(() => Object.keys(S.habits[1].done).length)).toBe(1);
  // Sunrise: chips keep your order after a tick
  await page.evaluate(() => setCfg('hbView', 'sun'));
  await page.locator('#rhythmPg .hs-chip').nth(1).click();
  await page.waitForTimeout(1300);
  await expect(page.locator('#rhythmPg .hs-chip').nth(1)).toHaveClass(/on/);
  await expect(page.locator('#rhythmPg .hs-chip .hs-n')).toHaveText(['Water', 'Read', 'Walk']);
  // Escape: menu first, then the page, even when focus left the page
  await page.locator('#hpMore').click();
  await page.evaluate(() => { render(); document.activeElement.blur(); });
  await page.keyboard.press('Escape');
  await expect(page.locator('#hpPop')).not.toHaveClass(/on/);
  await expect(page.locator('#rhythmPg')).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#rhythmPg')).not.toHaveClass(/on/);
  // the check-in closes on Escape too
  await page.evaluate(() => openCheckin());
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => ciOn)).toBe(false);
  // Home tiles: double tap ticks once
  await page.evaluate(() => { S.habits.forEach(h => delete h.done[today()]); save(); goHome(); });
  await page.locator('.app .hw-tile').nth(2).dblclick();
  expect(await done()).toEqual([false, false, true]);
  noErrors(errors);
});

test('habits: reorder by dragging or arrow keys, past-day toast with Undo, streak on Home', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.hwStyle = 'one'; const sp = S.spaces[0].id;
    S.cfg.weekStart = new Date().getDay() === 1 ? 0 : 1; // the week grid always has a past day, whatever weekday the tests run on
    const past = {}; for (let i = 1; i <= 12; i++) { const d = new Date(); d.setDate(d.getDate() - i); past[dkey(d)] = 1; }
    S.habits = ['Water', 'Read', 'Walk'].map((n, i) => ({ id: 'h' + i, name: n, e: '', space: sp, days: [0,1,2,3,4,5,6], done: i === 0 ? { ...past } : {}, created: Date.now() - 30 * DAY }));
    save(); applySettings(); goHome(); });
  // streak on the One at a time card
  await expect(page.locator('.app .hw-one .hw-st')).toHaveText('12 days in a row');
  // reorder from ⋯ → Edit habits
  await page.evaluate(() => openRhythm());
  await page.locator('#hpMore').click();
  await page.locator('#hpPop [data-hbord]').click();
  await expect(page.locator('#hbEd')).toHaveClass(/on/);
  await page.waitForTimeout(400); // let the popup finish opening before measuring rows
  const names = () => page.evaluate(() => S.habits.map(h => h.name));
  // drag Walk (3rd) above Water (1st)
  const g = await page.locator('#hbeList .gme-r').nth(2).locator('.ho-grip').boundingBox();
  const top = await page.locator('#hbeList .gme-r').nth(0).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 - (g.y - top.y + 10) * i / 10);
  await page.mouse.up();
  expect(await names()).toEqual(['Walk', 'Water', 'Read']);
  // arrow keys: move Walk back down one
  await page.locator('#hbeList .gme-r').nth(0).locator('.ho-grip').focus();
  await page.keyboard.press('ArrowDown');
  expect(await names()).toEqual(['Water', 'Walk', 'Read']);
  await expect(page.locator('#hbeList .gme-r').nth(1).locator('.ho-grip')).toBeFocused();
  await page.locator('#hbeDone').click();
  await expect(page.locator('#rhythmPg .hg-n')).toContainText(['Water', 'Walk', 'Read']);
  // ticking a past day says so, and Undo clears it
  await page.locator('#rhythmPg .hg-row').nth(2).locator('.hg-c.miss').first().click();
  await expect(page.locator('#toastMsg')).toContainText('Read · kept on');
  expect(await page.evaluate(() => Object.keys(S.habits[2].done).length)).toBe(1);
  await page.locator('#undoBtn').click();
  expect(await page.evaluate(() => Object.keys(S.habits[2].done).length)).toBe(0);
  noErrors(errors);
});

test('habits: Edit habits popup adds, renames, opens settings and deletes', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; const sp = S.spaces[0].id;
    S.habits = [{ id: 'h1', name: 'Water', e: '', space: sp, days: [0,1,2,3,4,5,6], done: {}, created: Date.now() }]; save(); applySettings(); openRhythm(); });
  await page.locator('#hpMore').click();
  await page.locator('#hpPop [data-hbord]').click();
  await expect(page.locator('#hbEd')).toHaveClass(/on/);
  await page.fill('#hbeAdd', 'Read 10 pages');
  await page.locator('#hbeAddB').click();
  await expect(page.locator('#hbEd .gme-r')).toHaveCount(2);
  expect(await page.evaluate(() => S.habits[1].e)).toBe('📖');
  await page.locator('#hbEd [data-hren="h1"]').fill('Drink water');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.habits[0].name)).toBe('Drink water');
  await page.locator('#hbEd [data-hdel="h1"]').click();
  await page.locator('#dlgYes').click();
  await expect(page.locator('#hbEd .gme-r')).toHaveCount(1);
  await page.locator('#hbEd [data-hopen]').click();
  await expect(page.locator('#hbEd')).not.toHaveClass(/on/);
  await expect(page.locator('#hbSheet')).toHaveClass(/on/);
  noErrors(errors);
});
