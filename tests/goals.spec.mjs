// Modes → Goals: off by default and invisible; 30-second setup; North star on Home; goal page with
// The climb, Path and Poster views; milestones (tick, make a task, finishing the task ticks it); task star + goal pill;
// Goals page; mark achieved; turning it off hides everything but keeps data; sync/backup/undo carry goals.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('goals: setup, north star, climb, path and poster, milestones, Goals page, achieved, off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  // off: nothing anywhere
  expect(await page.evaluate(() => goalsOn())).toBe(false);
  expect(await page.evaluate(() => nsCard())).toBe('');
  await page.evaluate(() => openDetail(S.tasks.find(t => t.stage === 'today').id));
  await expect(page.locator('#dPills [data-p="goal"]')).toHaveCount(0);
  await page.evaluate(() => closeSheets());

  // turn on in Settings → Modes, then New goal from "Your goals"
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-tg="goals"]').click();
  await expect.poll(() => page.evaluate(() => goalsOn())).toBe(true);
  await page.locator('#setIn [data-page="goals"]').click();
  await page.locator('#setIn [data-gnew]').click();
  await expect(page.locator('#gsPg')).toHaveClass(/on/);
  await expect(page.locator('#gsNext')).toBeDisabled();
  await page.fill('#gsName', 'Run a half marathon');
  await expect(page.locator('#gsE')).toHaveText('🏃'); // auto icon from the name
  await expect(page.locator('#gsPg [data-gssp=""]')).toHaveClass(/on/); // no space by default
  await page.locator('#gsPg [data-gssp]:not([data-gssp=""])').first().click(); // this one goes in a space
  await page.locator('#gsNext').click();
  await page.locator('[data-gsm="6"]').click();
  await page.locator('#gsNext').click();
  await page.fill('#gsMs', 'Run 10 km');
  await page.keyboard.press('Enter');
  await page.fill('#gsMs', 'Run 15 km');
  await page.locator('#gsMsAdd').click();
  await expect(page.locator('.gs-mi')).toHaveCount(2);
  await expect(page.locator('#gsStar')).toHaveAttribute('aria-pressed', 'true'); // first goal becomes the north star
  await page.locator('#gsGo').click();
  await expect(page.locator('#gsPg')).not.toHaveClass(/on/);
  const g = await page.evaluate(() => S.goals[0]);
  expect(g.name).toBe('Run a half marathon');
  expect(g.star).toBe(true);
  expect(g.ms.map(m => m.t)).toEqual(['Run 10 km', 'Run 15 km']);
  await expect(page.locator('#setIn [data-ge]')).toHaveCount(1);
  await page.evaluate(() => closeSettings());

  // North star on Home → goal page (The climb by default)
  await page.evaluate(() => goHome());
  await expect(page.locator('#homeView .ns-card, .ns-card:visible').first()).toBeVisible();
  await page.locator('.ns-card:visible').first().click();
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  await expect(page.locator('#gdPg .gb-svg')).toBeVisible();
  // tick the first milestone
  await page.locator('#gdPg [data-gtk]').first().click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[0].done)).toBe(true);
  // the card shows the next milestone; a task added there stays in the goal (no list, no stage)
  await expect(page.locator('#gdPg .gpp-nm b')).toHaveText('Run 15 km');
  await page.fill('#gMtIn', 'Long run Sunday');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.tasks.some(x => x.title === 'Long run Sunday'))).toBe(false);
  expect(await page.evaluate(() => S.goals[0].ms[1].items.map(x => x.t))).toEqual(['Long run Sunday']);
  await expect(page.locator('#gMtIn')).toBeFocused(); // ready for the next one
  // finishing its last task ticks the milestone
  await page.locator('#gMtIn').blur();
  await page.locator('#gdPg .gpp-ts [data-gmt]').first().click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[1].done)).toBe(true);
  await expect(page.locator('#gdPg [data-gwin]')).toBeVisible(); // summit reached → offer to mark achieved

  // other views under ⋯ → View: Path and Poster; add a milestone from the Path
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gview="path"]').click();
  await expect(page.locator('#gdPg .gpp-bar')).toBeVisible(); // phones: sunrise + step bar, one milestone at a time
  await expect(page.locator('#gdPg .gpp-st')).toHaveCount(2);
  await expect(page.locator('#gdBack')).toBeHidden();
  expect(await page.evaluate(() => S.goals[0].view)).toBe('path');
  await page.evaluate(() => { gAddMs = true; drawGoal(); });
  await page.fill('#gMsIn', 'Race day');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.goals[0].ms.length)).toBe(3);
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gview="poster"]').click();
  await expect(page.locator('#gdPg .gph-num')).toBeVisible(); // phones: the countdown is the hero, the rest of the page is the same
  await expect(page.locator('#gdPg .gpp-nm b')).toHaveText('Race day');
  const td = await page.evaluate(gid => { const l = S.lists.find(x => x.space === S.goals[0].space); const x = { id: newId(), title: 'Buy race shoes', stage: 'today', list: l.id, est: 30, subs: [], notes: '', repeat: 'none', goal: gid }; S.tasks.unshift(x); save(); return x; }, g.id);
  await page.locator('#tbGoals').click(); // phones have no Back: the Goals tab goes back
  await expect(page.locator('#gdPg')).not.toHaveClass(/on/);

  // the task wears a star; its details show the ★ goal pill and picker
  await page.evaluate(sp => openSpace(sp), g.space);
  await expect(page.locator('#list .g-st').first()).toBeVisible();
  await page.evaluate(id => openDetail(id), td.id);
  await expect(page.locator('#dPills [data-p="goal"]')).toContainText('Run a half marathon');
  await page.locator('#dPills [data-p="goal"]').click();
  await expect(page.locator('#dPicker .pk')).toHaveCount(2); // None + the goal
  await page.locator('#dPicker .pk').first().click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).goal, td.id)).toBeUndefined();
  await page.evaluate(() => closeSheets());

  // Home: the North star row sits in "Also today"; every goal is one tap away in the tab bar
  await page.evaluate(() => goHome());
  await expect(page.locator('.app .also .ns-card')).toContainText('2 of 3');
  await expect(page.locator('.ns-sub')).toHaveCount(0);
  await page.evaluate(() => { S.goals.push({ id: 'g2', name: 'Read 12 books', e: '', space: S.goals[0].space, why: '', due: '', created: Date.now(), star: false, ms: [] }); save(); render(); });
  await page.locator('#tbGoals').click();
  await expect(page.locator('#goalsPg')).toHaveClass(/on/);
  await expect(page.locator('#goalsPg .g-card')).toHaveCount(2);
  await page.evaluate(() => { S.goals = S.goals.filter(x => x.id !== 'g2'); save(); render(); });
  await expect(page.locator('#goalsPg .g-card')).toHaveCount(1);

  // mark achieved from the goal page menu: leaves Home and the active list
  await page.locator('#goalsPg .g-card').click();
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gm="win"]').click();
  await expect.poll(() => page.evaluate(() => S.goals[0].done)).toBe(true);
  expect(await page.evaluate(() => nsCard())).toBe('');
  await page.locator('#moGo').click().catch(() => {});
  await page.locator('#tbGoals').click(); // phones: the Goals tab goes back
  await expect(page.locator('#goalsPg .g-card')).toHaveCount(0);
  await expect(page.locator('#goalsPg .g-wrow')).toHaveCount(1);
  await page.locator('#glBack').click();

  // turning Goals off hides every trace; data stays
  await page.evaluate(() => { S.goals[0].done = false; S.cfg.goals = false; save(); render(); });
  expect(await page.evaluate(() => nsCard())).toBe('');
  await expect(page.locator('#tbGoals')).toHaveCount(0);
  await expect(page.locator('#list .g-st')).toHaveCount(0);
  expect(await page.evaluate(() => S.goals.length)).toBe(1);
  noErrors(errors);
});

test('goals: one north star, limit of 3, sync/backup/undo, desktop layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.goals = true; const sp = S.spaces[0].id, d = dkey(new Date(Date.now() + 90 * 864e5));
    S.goals = [1, 2, 3].map(i => ({ id: 'g' + i, name: 'Goal ' + i, e: '', space: sp, why: '', due: d, created: Date.now(), star: i === 1, ms: [{ id: 'm' + i, t: 'Step', done: false }] }));
    save(); render();
  });
  // a 4th goal is refused
  await page.evaluate(() => openSetup());
  await expect(page.locator('#gsPg')).not.toHaveClass(/on/);
  // starring another moves the star
  await page.evaluate(() => openGoal('g2'));
  // computers: the milestones sit in a list beside the card, which starts right under the hero
  await expect(page.locator('#gdPg .gm-msl')).toBeVisible();
  await expect(page.locator('#gdPg .gm-track')).toHaveCount(0);
  expect((await page.locator('#gdPg .gm-card').boundingBox()).y).toBeLessThan(700);
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gm="star"]').click();
  expect(await page.evaluate(() => S.goals.filter(g => g.star).map(g => g.id))).toEqual(['g2']);
  // sync, backup and undo carry goals
  expect(await page.evaluate(() => localDoc().goals.length)).toBe(3);
  expect(await page.evaluate(() => JSON.parse(backupData()).goals.length)).toBe(3);
  await page.evaluate(() => gDelete(gById('g3')));
  await page.locator('#dlgYes').click();
  await expect.poll(() => page.evaluate(() => S.goals.length)).toBe(2);
  await page.locator('#undoBtn').click();
  await expect.poll(() => page.evaluate(() => S.goals.length)).toBe(3);
  // computers: no Goals page; "Goals" in the sidebar folds open to list every goal, a goal opens its page, no back button
  await page.evaluate(() => { closeGoal(); goHome(); S.gSideOpen = false; save(); renderDesk(); });
  await page.locator('#sGoals').click();
  await expect(page.locator('#goalsPg')).not.toHaveClass(/on/);
  await expect(page.locator('#sLists [data-sgoal]')).toHaveCount(3);
  await page.locator('#sLists [data-sgoal="g3"]').click();
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  expect(await page.evaluate(() => gdId)).toBe('g3');
  await expect(page.locator('#sLists [data-sgoal="g3"]')).toHaveClass(/on/);
  await expect(page.locator('#gdBack')).toBeHidden();
  await page.locator('#sGoals').click(); // folds closed again
  await expect(page.locator('#sLists [data-sgoal]')).toHaveCount(0);
  await page.evaluate(() => { closeGoal(); openGoals(); }); // asking for the Goals page opens the fold and a goal instead
  await expect(page.locator('#goalsPg')).not.toHaveClass(/on/);
  await expect(page.locator('#sLists [data-sgoal]')).toHaveCount(3);
  noErrors(errors);
});

test('goal page: double tap ticks once, past due reads right, summit, calm redraws', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.goals = true; const sp = S.spaces[0].id;
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: sp, why: '', due: dkey(new Date(Date.now() - 5 * DAY)), created: Date.now() - 20 * DAY, star: true,
      ms: Array.from({ length: 6 }, (_, i) => ({ id: 'm' + i, t: 'Step ' + (i + 1), done: i < 3 })) }];
    save(); applySettings(); openGoal('g1');
  });
  // phones: one shared page (hero, name, step bar, one milestone at a time); the climb's hero is the mountain
  await expect(page.locator('#gdPg .gph-mtn')).toBeVisible();
  await expect(page.locator('#gdPg .gpp-st')).toHaveCount(6);
  await expect(page.locator('#gdPg .gpp-st.on')).toHaveCount(3);
  // past due: counts the days over, never "0 days left"
  await expect(page.locator('#gdPg .gr-f')).toContainText('days over');
  // no Back on phones (the Goals tab is there); the facts sit top left
  await expect(page.locator('#gdBack')).toBeHidden();
  await expect(page.locator('#gdPg .gr-meta .gr-f')).toBeVisible();
  // the card opens on Next; a quick double tap on Mark done ticks it once
  await expect(page.locator('#gdPg .gpp-st.sel.nx')).toHaveCount(1); // opens on Next, its tasks below (no card)
  await expect(page.locator('#gdPg .gpp .gm-card')).toHaveCount(0);
  await page.locator('#gdPg .gpp-done').dblclick();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms.filter(m => m.done).length)).toBe(4);
  // adding a milestone lives in the goal's ⋯ menu → Edit milestones (no extra buttons on the page)
  await expect(page.locator('#gdPg .gm-head')).toHaveCount(0); // the stats above already count milestones
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gedit]').click();
  await page.fill('#gmeAdd', 'Extra step');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.goals[0].ms.length)).toBe(7);
  await page.keyboard.press('Escape'); // closes the popup, not the page
  await expect(page.locator('#gmEd')).not.toHaveClass(/on/);
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  await page.evaluate(() => { S.goals[0].ms.pop(); save(); render(); });
  // tapping a milestone (track or hill dot) opens its card and never ticks it
  const before = await page.evaluate(() => S.goals[0].ms.map(m => !!m.done));
  await page.locator('#gdPg .gpp-st[data-gsel="m1"]').click();
  await expect(page.locator('#gdPg .gpp-nm b')).toHaveText('Step 2');
  await page.evaluate(() => document.querySelector('#gdPg .gb-svg [data-gsel="m5"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect(page.locator('#gdPg .gpp-nm b')).toHaveText('Step 6');
  expect(await page.evaluate(() => S.goals[0].ms.map(m => !!m.done))).toEqual(before);
  // milestones are parent tasks: the last task done ticks it; reopening a task reopens it;
  // marking it done finishes its open tasks; reopening the milestone leaves its tasks as they are
  await page.fill('#gMtIn', 'A');
  await page.keyboard.press('Enter');
  await page.fill('#gMtIn', 'B');
  await page.keyboard.press('Enter');
  await expect(page.locator('#gdPg .gpp-ts .gm-t')).toHaveCount(2);
  const st = () => page.evaluate(() => [S.goals[0].ms[5].done, ...['A', 'B'].map(n => S.goals[0].ms[5].items.find(x => x.t === n).done ? 'done' : 'week')]);
  await expect(page.locator('#gdPg .gpp-ts .gm-tt b')).toHaveText(['A', 'B']); // oldest first, add field at the bottom
  await page.locator('#gdPg .gpp-ts .gm-t').nth(0).locator('[data-gmt]').click();
  await expect.poll(st).toEqual([false, 'done', 'week']);
  await page.waitForTimeout(450);
  await page.locator('#gdPg .gpp-ts .gm-t').nth(1).locator('[data-gmt]').click();
  await expect.poll(st).toEqual([true, 'done', 'done']);
  await expect(page.locator('#gdPg .gpp-eye')).toContainText('done'); // the moment shows on the same milestone
  await expect(page.locator('#gdPg .gpp-done')).toHaveText('Reopen milestone'); // and undoing it is right there
  await page.waitForTimeout(450);
  await page.locator('#gdPg .gpp-ts .gm-t').nth(1).locator('[data-gmt]').click();
  await expect.poll(st).toEqual([false, 'done', 'week']);
  await page.evaluate(() => gMsToggle(S.goals[0], S.goals[0].ms[5]));
  await expect.poll(st).toEqual([true, 'done', 'done']);
  await page.evaluate(() => gMsToggle(S.goals[0], S.goals[0].ms[5]));
  await expect.poll(st).toEqual([false, 'done', 'done']);
  // the older one-task link still counts as the milestone's task
  await page.evaluate(() => { const g = S.goals[0], l = S.lists.find(x => x.space === g.space); const x = { id: 7777, title: 'Old link', stage: 'week', list: l.id, est: 30, subs: [], notes: '', repeat: 'none', goal: g.id }; S.tasks.push(x); g.ms[0].task = 7777; save(); render(); });
  expect(await page.evaluate(() => gMsTasks(S.goals[0].ms[0]).map(x => x.title))).toEqual(['Old link']);
  // goal tasks in no milestone show under Other tasks
  await page.evaluate(() => { const g = S.goals[0], l = S.lists.find(x => x.space === g.space); S.tasks.push({ id: 8888, title: 'Loose one', stage: 'week', list: l.id, est: 30, subs: [], notes: '', repeat: 'none', goal: g.id }); save(); render(); });
  await expect(page.locator('#gdPg .gv-sec h2')).toContainText(['Other tasks']);
  await expect(page.locator('#gdPg .g-trow')).toContainText(['Loose one']);
  // nothing changed → no redraw (motion stays calm)
  const same = await page.evaluate(() => { render(); const a = document.querySelector('#gdIn .gb-svg'); render(); return a === document.querySelector('#gdIn .gb-svg'); });
  expect(same).toBe(true);
  // summit: the Mark achieved button stands in for the pace
  await page.evaluate(() => { S.goals[0].ms.forEach(m => m.done = true); save(); render(); });
  await expect(page.locator('#gdPg [data-gwin]')).toBeVisible();
  await expect(page.locator('#gdPg .gr-f .gp-ahead, #gdPg .gr-f .gp-on, #gdPg .gr-f .gp-behind')).toHaveCount(0);
  // poster and path: past due wording
  await page.evaluate(() => { S.goals[0].ms[5].done = false; S.goals[0].view = 'poster'; save(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gph-num')).toContainText('days past due');
  await page.evaluate(() => { S.goals[0].view = 'path'; S.goals[0].due = ''; save(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gr-f')).not.toContainText('days left');
  await expect(page.locator('#gdPg .gr-f')).not.toContainText('On track'); // no pace words on phones
  noErrors(errors);
});

test('goals: Escape closes the ⋯ menu, then the goal page, then the Goals page, wherever focus is', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; const sp = S.spaces[0].id;
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: sp, why: '', due: '', created: Date.now(), star: false, ms: [{ id: 'm1', t: 'Step', done: false }] }];
    save(); applySettings(); openGoals(); openGoal('g1'); });
  const blur = () => page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.locator('#gdMore').click();
  await blur();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gdPop')).not.toHaveClass(/on/);
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  await blur();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gdPg')).not.toHaveClass(/on/);
  await expect(page.locator('#goalsPg')).toHaveClass(/on/);
  await blur();
  await page.keyboard.press('Escape');
  await expect(page.locator('#goalsPg')).not.toHaveClass(/on/);
  noErrors(errors);
});

test('goal page: subtask rings, lists capped at 3, even track, milestone editor popup', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 }); // the track is the tablet layout (phones have the roadmap)
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; const sp = S.spaces[0].id, l = S.lists.find(x => x.space === sp);
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: sp, why: '', due: '', created: Date.now(), star: false, ms: ['A', 'B', 'C', 'D'].map((t, i) => ({ id: 'm' + i, t, done: i === 0 })) }];
    const mk = (title, subs) => S.tasks.push({ id: newId(), title, stage: 'week', list: l.id, est: 30, subs, notes: '', repeat: 'none', goal: 'g1', ms: 'm1' });
    mk('With subs', [{ id: 1, t: 'one', done: true }, { id: 2, t: 'two', done: false }, { id: 3, t: 'three', done: false }]);
    for (let i = 0; i < 12; i++) mk('Task ' + i, []);
    save(); applySettings(); openGoal('g1'); });
  // the track: rings evenly spaced, no second ring on the selected one
  const xs = await page.evaluate(() => [...document.querySelectorAll('#gdPg .gm-nk')].map(e => { const b = e.getBoundingClientRect(); return Math.round(b.left + b.width / 2); }));
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#gdPg .gm-n.sel .gm-nk'), '::after').content)).toBe('none');
  // a computer swaps the track for the list beside the card
  await page.setViewportSize({ width: 1400, height: 900 });
  await expect(page.locator('#gdPg .gm-msl .gpo-m')).toHaveCount(4);
  // subtasks: a ring with 1/3; tap it to see and tick them
  await expect(page.locator('#gdPg .gm-sub')).toHaveText('1/3');
  await page.locator('#gdPg .gm-sub').click();
  await expect(page.locator('#gdPg .gm-s')).toHaveCount(3);
  await page.locator('#gdPg .gm-s').nth(1).click();
  expect(await page.evaluate(() => S.tasks.find(x => x.title === 'With subs').subs.map(s => !!s.done))).toEqual([true, true, false]);
  await expect(page.locator('#gdPg .gm-sub')).toHaveText('2/3');
  // a long task list shows 3 and "+N more" (cards stay even); it opens and closes
  await expect(page.locator('#gdPg .gm-ts .gm-t')).toHaveCount(3);
  await expect(page.locator('#gdPg .gm-ts .gm-cap')).toHaveText('+10 more');
  await page.locator('#gdPg .gm-ts .gm-cap').click();
  await expect(page.locator('#gdPg .gm-ts .gm-t')).toHaveCount(13);
  await page.evaluate(() => render());
  await expect(page.locator('#gdPg .gm-ts .gm-cap')).toHaveText('Show less'); // stays open across redraws
  await page.locator('#gdPg .gm-ts .gm-cap').click();
  await expect(page.locator('#gdPg .gm-ts .gm-t')).toHaveCount(3);
  // milestone editor: a popup in the middle; rename, reorder (drag and keys), add, delete; Escape closes only the popup
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gedit]').click();
  await expect(page.locator('#gmEd')).toHaveClass(/on/);
  const box = await page.locator('#gmEd .gme-in').boundingBox();
  expect(Math.abs(box.x + box.width / 2 - 700)).toBeLessThan(4);
  await page.locator('#gmEd [data-mren="m3"]').fill('D renamed');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.goals[0].ms[3].t)).toBe('D renamed');
  await page.waitForTimeout(300);
  const g = await page.locator('#gmEd .gme-r').nth(3).locator('.ho-grip').boundingBox();
  const top = await page.locator('#gmEd .gme-r').nth(0).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 - (g.y - top.y + 10) * i / 10);
  await page.mouse.up();
  expect(await page.evaluate(() => S.goals[0].ms.map(m => m.t))).toEqual(['D renamed', 'A', 'B', 'C']);
  await page.locator('#gmEd .gme-r').nth(0).locator('.ho-grip').focus();
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => S.goals[0].ms.map(m => m.t))).toEqual(['A', 'D renamed', 'B', 'C']);
  await page.fill('#gmeAdd', 'E');
  await page.keyboard.press('Enter');
  await expect(page.locator('#gmEd .gme-r')).toHaveCount(5);
  await expect(page.locator('#gmeAdd')).toBeFocused();
  await page.locator('#gmEd [data-mdel="m2"]').click();
  await expect(page.locator('#gmEd .gme-r')).toHaveCount(4);
  expect(await page.evaluate(() => S.tasks.filter(x => x.ms === 'm2').length)).toBe(0);
  await page.locator('#gmeAdd').blur();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gmEd')).not.toHaveClass(/on/);
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  await expect(page.locator('#gdPg .gm-msl .gpo-m')).toHaveCount(4);
  noErrors(errors);
});

test('goal page: milestone tasks need no space or list; add one to a list and back; standalone goals and habits', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; S.cfg.habits = true;
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: null, why: '', due: '', created: Date.now(), star: false, ms: [{ id: 'm0', t: 'A', done: false }, { id: 'm1', t: 'B', done: false }] }];
    save(); applySettings(); openGoal('g1'); });
  // a goal with no space shows everywhere it should
  expect(await page.evaluate(() => gAll().length)).toBe(1);
  // many tasks, no limit popup: they live in the goal
  for (let i = 0; i < 14; i++) { await page.fill('#gMtIn', 'T' + i); await page.keyboard.press('Enter'); }
  expect(await page.evaluate(() => [S.goals[0].ms[0].items.length, S.tasks.filter(x => x.goal === 'g1').length])).toEqual([14, 0]);
  await expect(page.locator('#gdPg .gm-t').last()).toBeInViewport();
  await expect(page.locator('#gdPg .gm-ts .gm-t')).toHaveCount(14); // adding opens the list, so new tasks never hide under "+N more"
  await expect(page.locator('#gdPg .gm-t .gm-in')).toHaveCount(0); // goal-only tasks show no list
  // ⋯ → Add to a list…: it becomes a real task in that list (My week), still in the milestone
  await page.locator('#gMtIn').blur();
  const listName = await page.evaluate(() => S.lists[0].name);
  await page.locator('#gdPg .gm-t').first().hover();
  await page.locator('#gdPg .gm-t').first().locator('[data-gtm]').click();
  await page.locator('#cxPop button', { hasText: 'Add to a list' }).click();
  await page.locator('#cxPop button', { hasText: listName }).first().click();
  const t = await page.evaluate(() => S.tasks.find(x => x.title === 'T0'));
  expect([t.stage, t.goal, t.ms]).toEqual(['week', 'g1', 'm0']);
  expect(await page.evaluate(() => S.goals[0].ms[0].items.length)).toBe(13);
  await expect(page.locator('#gdPg .gm-t .gm-in')).toHaveCount(1); // it now shows its list
  // ⋯ → Keep in the goal only: back to a goal task, out of the list
  const k = 't' + t.id;
  await page.locator(`#gdPg [data-gtm="${k}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Keep in the goal only' }).click();
  expect(await page.evaluate(() => [S.tasks.some(x => x.title === 'T0'), S.goals[0].ms[0].items.length])).toEqual([false, 14]);
  // move a goal task to another milestone; ticking B's only task ticks B
  await page.locator('#gdPg .gm-t').first().hover();
  await page.locator('#gdPg .gm-t').first().locator('[data-gtm]').click();
  await page.locator('#cxPop button', { hasText: 'Move to' }).click();
  await page.locator('#cxPop button', { hasText: 'B' }).click();
  expect(await page.evaluate(() => S.goals[0].ms[1].items.length)).toBe(1);
  await page.evaluate(() => { gSelId = 'm1'; drawGoal(); });
  await page.locator('#gdPg .gm-card [data-gmt]').first().click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[1].done)).toBe(true);
  // setup and editing offer "No space" (the default); habits need no space either
  await page.evaluate(() => { closeGoal(); openSetup(); });
  await expect(page.locator('#gsPg [data-gssp=""]')).toHaveClass(/on/);
  await page.evaluate(() => closeSetup());
  await page.evaluate(() => openHabit(null));
  await page.fill('#hbName', 'Walk');
  await page.locator('#hbSave').click();
  expect(await page.evaluate(() => [S.habits.at(-1).space, hbAll().some(h => h.name === 'Walk')])).toEqual([null, true]);
  noErrors(errors);
});

test('goal page and Goals page: ⋯ menus to rename, move, add subtasks, delete; cards have menus', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; const sp = S.spaces[0].id, l = S.lists.find(x => x.space === sp);
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: sp, why: '', due: '', created: Date.now(), star: false, ms: [{ id: 'm0', t: 'A', done: false }, { id: 'm1', t: 'B', done: false }] }];
    S.tasks.push({ id: 9001, title: 'Old name', stage: 'week', list: l.id, est: 30, subs: [], notes: '', repeat: 'none', goal: 'g1', ms: 'm0' });
    save(); applySettings(); openGoal('g1'); });
  const menu = async (sel, item) => { await page.locator(sel).click(); await page.locator('#cxPop button', { hasText: item }).first().click(); };
  // rename inline
  await menu('#gdPg [data-gtm="t9001"]', 'Rename');
  await expect(page.locator('#gdPg [data-gren="t9001"]')).toBeFocused();
  await page.keyboard.press('Control+a'); await page.keyboard.type('New name'); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 9001).title)).toBe('New name');
  // add subtasks inline, then delete one
  await menu('#gdPg [data-gtm="t9001"]', 'Add a subtask');
  await expect(page.locator('#gdPg [data-gsadd="t9001"]')).toBeFocused();
  await page.keyboard.type('one'); await page.keyboard.press('Enter');
  await page.keyboard.type('two'); await page.keyboard.press('Enter');
  await expect(page.locator('#gdPg .gm-sub')).toHaveText('0/2');
  await page.locator('#gdPg .gm-sx').first().click();
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 9001).subs.map(s => s.t))).toEqual(['two']);
  // Escape in the add field leaves the page open
  await page.locator('#gdPg [data-gsadd="t9001"]').focus(); await page.keyboard.press('Escape');
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  // move to another milestone, then to Other tasks
  await page.locator('#gdPg [data-gtm="t9001"]').click();
  await page.locator('#cxPop button', { hasText: 'Move to' }).click();
  await page.locator('#cxPop button', { hasText: 'B' }).click();
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 9001).ms)).toBe('m1');
  await page.locator('#gdPg .gm-msl [data-gsel="m1"]').click();
  await page.locator('#gdPg [data-gtm="t9001"]').click();
  await page.locator('#cxPop button', { hasText: 'Move to' }).click();
  await page.locator('#cxPop button', { hasText: 'Other tasks' }).click();
  expect(await page.evaluate(() => S.tasks.find(x => x.id === 9001).ms)).toBeUndefined();
  await expect(page.locator('#gdPg .g-tr2 [data-gtm="t9001"]')).toHaveCount(1);
  // delete asks first
  await menu('#gdPg .g-tr2 [data-gtm="t9001"]', 'Delete task');
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(() => S.tasks.some(x => x.id === 9001))).toBe(false);
  // milestone menu: rename opens the popup on that name; the popup adds with its Add button
  await menu('#gdPg .gm-card [data-gmm]', 'Rename');
  await expect(page.locator('#gmEd')).toHaveClass(/on/);
  await expect(page.locator('#gmEd [data-mren="m1"]')).toBeFocused(); // the card shows B, so B's name is ready to edit
  await page.fill('#gmeAdd', 'C'); await page.locator('#gmeAddB').click();
  expect(await page.evaluate(() => S.goals[0].ms.map(m => m.t))).toEqual(['A', 'B', 'C']);
  await page.keyboard.press('Escape');
  await expect(page.locator('#gmEd')).not.toHaveClass(/on/);
  // Escape closes an open ⋯ menu without leaving the page
  await page.locator('#gdPg .gm-card [data-gmm]').click();
  await expect(page.locator('#cxPop')).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#cxPop')).not.toHaveClass(/on/);
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  // Goals page (phones and tablets): each card has a ⋯ (north star, achieved, delete)
  await page.setViewportSize({ width: 800, height: 900 });
  await page.evaluate(() => { closeGoal(); openGoals(); });
  await menu('#goalsPg [data-gcm="g1"]', 'Make it my north star');
  expect(await page.evaluate(() => S.goals[0].star)).toBe(true);
  await expect(page.locator('#goalsPg .g-card small').first()).toHaveText('No date set');
  await menu('#goalsPg [data-gcm="g1"]', 'Delete goal');
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(() => S.goals.length)).toBe(0);
  noErrors(errors);
});

test('goal page: one calm facts line; why as a quote that can be hidden from the page', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true;
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: null, why: 'Feel strong', due: dkey(new Date(Date.now() + 41 * DAY)), created: Date.now(), star: true, ms: [{ id: 'm0', t: 'A', done: true }, { id: 'm1', t: 'B', done: false }] }];
    save(); applySettings(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gb-line')).toContainText('1/2 milestones');
  await expect(page.locator('#gdPg .gb-line')).toContainText('41 days to');
  await expect(page.locator('#gdPg .gv-why.note')).toContainText('Feel strong');
  await expect(page.locator('#gdPg .gv-why.note .gw-i')).toHaveCount(0); // no icon by default
  // north star: the twinkling star in the sky, which can be hidden and shown again
  await expect(page.locator('#gdPg .gb-ns')).toHaveCount(1);
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gm="nsky"]').click();
  await expect(page.locator('#gdPg .gb-ns')).toHaveCount(0);
  expect(await page.evaluate(() => [S.goals[0].star, S.goals[0].hideNs])).toEqual([true, true]);
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gm="nsky"]').click();
  await expect(page.locator('#gdPg .gb-ns')).toHaveCount(1);
  // hide it from the ⋯ menu; it stays in the goal
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gm="why"]').click();
  await expect(page.locator('#gdPg .gv-why')).toHaveCount(0);
  expect(await page.evaluate(() => [S.goals[0].hideWhy, S.goals[0].why])).toEqual([true, 'Feel strong']);
  // Edit goal shows it and can bring it back
  await page.evaluate(() => openGoalSheet('g1'));
  await expect(page.locator('#gWhy')).toHaveValue('Feel strong');
  await expect(page.locator('#gWhyVis [data-gwv="0"]')).toHaveClass(/on/);
  await page.locator('#gWhyVis [data-gwv="1"]').click();
  await page.locator('#gWhyIco [data-gwe="🌱"]').click(); // pick an emoji for the note
  await page.locator('#gSave').click();
  await expect(page.locator('#gdPg .gv-why.note')).toHaveCount(1);
  await expect(page.locator('#gdPg .gv-why.note .gw-i')).toHaveText('🌱');
  // or no icon at all
  await page.evaluate(() => openGoalSheet('g1'));
  await page.locator('#gWhyIco [data-gwe="n"]').click(); // None
  await page.locator('#gSave').click();
  await expect(page.locator('#gdPg .gv-why.note .gw-i')).toHaveCount(0);
  expect(await page.evaluate(() => S.goals[0].whyE)).toBeUndefined();
  noErrors(errors);
});

test('phone Path: a milestone with no tasks can be marked done (and reopened) from one clear row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true;
    S.goals = [{ id: 'g1', name: 'Run', e: '', space: S.spaces[0].id, why: '', due: '', created: Date.now(), star: false, view: 'path', ms: [{ id: 'm0', t: 'A', done: false }, { id: 'm1', t: 'B', done: false }] }];
    save(); applySettings(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gpp-done')).toHaveText('Mark milestone done');
  await page.evaluate(() => { window.__sfxLog = []; });
  await page.locator('#gdPg .gpp-done').click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[0].done)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__sfxLog)).toEqual(['milestone', 'rise']); // a milestone chime, then the sun's soft glide
  // the view is called Sunrise on phones
  await page.locator('#gdMore').click();
  await expect(page.locator('#gdPop [data-gview="path"]')).toContainText('Sunrise');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { gSelId = 'm0'; drawGoal(); });
  await expect(page.locator('#gdPg .gpp-done')).toHaveText('Reopen milestone');
  await page.locator('#gdPg .gpp-done').click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[0].done)).toBe(false);
  // the same page in all three views; only the hero changes
  for (const [v, hero] of [['climb', '.gph-mtn'], ['poster', '.gph-num'], ['path', '.gpp-sun']]) {
    await page.evaluate(v => { S.goals[0].view = v; save(); drawGoal(); }, v);
    await expect(page.locator('#gdPg ' + hero)).toBeVisible();
    await expect(page.locator('#gdPg .gpp-bar')).toBeVisible();
    await expect(page.locator('#gdPg .gpp-done')).toBeVisible();
  }
  noErrors(errors);
});
