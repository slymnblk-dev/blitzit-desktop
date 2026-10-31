// Routines (optional mode): small rituals you run step by step. Phone: a Routines tab. Computer: "Routines" under Modes.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('off by default; on: start from a template, edit steps, play it through, streak, Wins, sync and undo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; save(); applySettings(); goHome(); });
  await expect(page.locator('#tabBar [data-tab="routines"]')).toHaveCount(0);
  await page.evaluate(() => { S.cfg.routines = true; S.cfg.wins = true; save(); applySettings(); goHome(); });
  await page.locator('#tabBar [data-tab="routines"]').click();
  await expect(page.locator('#routinesPg')).toHaveClass(/on/);
  // empty: three templates
  await expect(page.locator('#routinesPg .rt-tpl')).toHaveCount(3);
  await page.locator('#routinesPg .rt-tpl', { hasText: 'Evening wind-down' }).click();
  expect(await page.evaluate(() => [S.routines.length, S.routines[0].steps.length, S.routines[0].days.length])).toEqual([1, 5, 7]);
  // it travels with sync and backups
  expect(await page.evaluate(() => [JSON.parse(backupData()).routines.length, localDoc().routines.length])).toEqual([1, 1]);
  // due every day, so it's up next
  await expect(page.locator('#routinesPg .rt-next .rt-nn')).toContainText('Evening wind-down');
  // open the editor (phone: its own view, with Back)
  await page.locator('#routinesPg .rt-next .rt-nn').click();
  await expect(page.locator('#rtName')).toHaveValue('Evening wind-down');
  await page.locator('#rtNewStep').fill('Brush teeth');
  await page.keyboard.press('Enter');
  await expect(page.locator('#routinesPg .rt-step[data-rtstep]')).toHaveCount(6);
  await expect(page.locator('#rtNewStep')).toBeFocused();
  // rename a step, change its time
  const st = page.locator('#routinesPg [data-rtst]').first();
  await st.fill('Phone away');
  await st.press('Enter');
  await page.locator('#routinesPg [data-rtmin]').first().selectOption('2');
  expect(await page.evaluate(() => [S.routines[0].steps[0].t, S.routines[0].steps[0].m])).toEqual(['Phone away', 2]);
  // delete the last step from its ⋯, Undo brings it back
  await page.locator('#routinesPg [data-rtsm]').last().click({ force: true });
  await page.locator('#cxPop button', { hasText: 'Delete step' }).click();
  await expect(page.locator('#routinesPg .rt-step[data-rtstep]')).toHaveCount(5);
  await page.locator('#undoBtn').click();
  await expect(page.locator('#routinesPg .rt-step[data-rtstep]')).toHaveCount(6);
  // play it: one step at a time
  await page.locator('#routinesPg .rt-play').click();
  await expect(page.locator('#rtPlay')).toHaveClass(/on/);
  await expect(page.locator('#rtPlay .rp-h')).toHaveText('Phone away');
  await expect(page.locator('#rtPlay .rp-eye')).toContainText('1 of 6');
  await expect(page.locator('#rtPlay .rp-clock')).toHaveText(/^[12]:\d\d$/);
  await page.locator('#rtPlay [data-rppause]').click();
  await expect(page.locator('#rtPlay [data-rppause]')).toHaveAttribute('aria-label', 'Resume');
  await page.locator('#rtPlay [data-rpdone]').click();
  await expect(page.locator('#rtPlay .rp-h')).toHaveText('Tidy up');
  await page.locator('#rtPlay [data-rpskip]').click();
  for (let i = 0; i < 4; i++) await page.locator('#rtPlay [data-rpdone]').click();
  await expect(page.locator('#rtPlay .rp-big')).toContainText('5/6');
  expect(await page.evaluate(() => !!S.routines[0].log[today()])).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#rtPlay')).not.toHaveClass(/on/);
  // done today: nothing up next; the routine lands in Wins
  await page.locator('#rtBack').click();
  await expect(page.locator('#routinesPg .rt-calm')).toContainText('All done for today');
  await expect(page.locator('#routinesPg .rt-card')).toContainText('Done today');
  await page.locator('#tabBar [data-tab="wins"]').click();
  await expect(page.locator('#winsPg .wn-it', { hasText: 'Routine: Evening wind-down' })).toHaveCount(1);
  // turning the mode off removes the tab, the routine stays
  await page.evaluate(() => setCfg('routines', false));
  await expect(page.locator('#tabBar [data-tab="routines"]')).toHaveCount(0);
  expect(await page.evaluate(() => S.routines.length)).toBe(1);
  noErrors(errors);
});

test('computer: sidebar opens Routines with the list and the editor side by side; days, time, new and delete', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.routines = true;
    S.routines = [{ id: 901, name: 'Morning', e: '☀️', at: '07:00', days: [0, 1, 2, 3, 4, 5, 6], steps: [{ id: 902, t: 'Water', m: 1 }, { id: 903, t: 'Stretch', m: 5 }], log: {}, created: Date.now() }];
    save(); applySettings(); goHome();
  });
  await expect(page.locator('#sRoutines .n')).toHaveText('1');
  await page.locator('#sRoutines').click();
  await expect(page.locator('#routinesPg')).toHaveClass(/on/);
  await expect(page.locator('#routinesPg .rt-r #rtName')).toHaveValue('Morning');
  // days and time
  await page.locator('#routinesPg [data-rtday="0"]').click();
  await page.locator('#routinesPg [data-rtday="6"]').click();
  await expect(page.locator('#routinesPg .rt-ed .pg-eye').first()).toContainText('Weekdays · 07:00');
  await page.locator('#routinesPg [data-rtat]').click();
  expect(await page.evaluate(() => S.routines[0].at)).toBe('');
  // new routine: named from the editor
  await page.locator('#routinesPg [data-rtnew]').click();
  await expect(page.locator('#rtName')).toBeFocused();
  await page.keyboard.type('Shutdown');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.routines.map(r => r.name))).toEqual(['Morning', 'Shutdown']);
  // delete it from ⋯ (Undo is there)
  await page.locator('#routinesPg [data-rtm]').click();
  await page.locator('#cxPop button', { hasText: 'Delete routine' }).click();
  expect(await page.evaluate(() => S.routines.length)).toBe(1);
  // Escape stops the routine (nothing logged), then closes the page
  await page.locator('#routinesPg .rt-r .rt-play').click();
  await expect(page.locator('#rtPlay .rp-h')).toHaveText('Water');
  await page.keyboard.press('Escape');
  await expect(page.locator('#rtPlay')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => Object.keys(S.routines[0].log).length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#routinesPg')).not.toHaveClass(/on/);
  // Settings → Modes has a Routines card
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .md-card[data-md="routines"]')).toContainText('Routines');
  noErrors(errors);
});
