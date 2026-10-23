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
  // the card shows the next milestone; a task added there lands in My week, linked to goal and milestone
  await expect(page.locator('#gdPg .gm-card .gm-hx b')).toHaveText('Run 15 km');
  await page.fill('#gMtIn', 'Long run Sunday');
  await page.keyboard.press('Enter');
  const t = await page.evaluate(() => S.tasks.find(x => x.title === 'Long run Sunday'));
  expect(t.stage).toBe('week');
  expect(t.goal).toBe(g.id);
  expect(t.ms).toBe(g.ms[1].id);
  await expect(page.locator('#gMtIn')).toBeFocused(); // ready for the next one
  // finishing its last task ticks the milestone (the page catches up once you leave the field)
  await page.locator('#gMtIn').blur();
  await page.evaluate(id => { const x = S.tasks.find(y => y.id === id); commit(() => setStage(x, 'done'), 'Done'); }, t.id);
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[1].done)).toBe(true);
  await expect(page.locator('#gdPg [data-gwin]')).toBeVisible(); // summit reached → offer to mark achieved

  // other views under ⋯ → View: Path and Poster; add a milestone from the Path
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gview="path"]').click();
  await expect(page.locator('#gdPg .gpth-list')).toBeVisible();
  expect(await page.evaluate(() => S.goals[0].view)).toBe('path');
  await page.fill('#gMsIn', 'Race day');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.goals[0].ms.length)).toBe(3);
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gview="poster"]').click();
  await expect(page.locator('#gdPg .gpo-num')).toBeVisible();
  await expect(page.locator('#gdPg .gm-card.hot')).toContainText('Race day'); // the coral block shows the next milestone and its tasks
  const td = await page.evaluate(gid => { const l = S.lists.find(x => x.space === S.goals[0].space); const x = { id: newId(), title: 'Buy race shoes', stage: 'today', list: l.id, est: 30, subs: [], notes: '', repeat: 'none', goal: gid }; S.tasks.unshift(x); save(); return x; }, g.id);
  await page.locator('#gdBack').click();
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

  // Home: the North star card is the one spot for a single goal, so no extra Goals row
  await page.evaluate(() => goHome());
  await expect(page.locator('.ns-card:visible').first()).toContainText('2 of 3');
  await expect(page.locator('.ns-sub')).toHaveCount(0);
  await expect(page.locator('#glEntry')).toHaveCount(0);
  // a second goal brings the Goals row back, so every goal stays one tap away
  await page.evaluate(() => { S.goals.push({ id: 'g2', name: 'Read 12 books', e: '', space: S.goals[0].space, why: '', due: '', created: Date.now(), star: false, ms: [] }); save(); render(); });
  await page.locator('#glEntry').click();
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
  await page.locator('#gdBack').click();
  await expect(page.locator('#goalsPg .g-card')).toHaveCount(0);
  await expect(page.locator('#goalsPg .g-wrow')).toHaveCount(1);
  await page.locator('#glBack').click();

  // turning Goals off hides every trace; data stays
  await page.evaluate(() => { S.goals[0].done = false; S.cfg.goals = false; save(); render(); });
  expect(await page.evaluate(() => nsCard())).toBe('');
  await expect(page.locator('#glEntry')).toHaveCount(0);
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
  await expect(page.locator('#gdPg .gm-track')).toBeVisible();
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
  // desktop: sidebar Goals page, cards with a small climb
  await page.evaluate(() => { closeGoal(); goHome(); });
  await page.locator('#sGoals').click();
  await expect(page.locator('#goalsPg .g-card')).toHaveCount(3);
  await expect(page.locator('#goalsPg .g-cmini svg').first()).toBeVisible();
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
  // every milestone sits on one track that fits: the first one is in view, nothing scrolls sideways
  await expect(page.locator('#gdPg .gm-n')).toHaveCount(6);
  await expect(page.locator('#gdPg .gm-n').first()).toBeInViewport();
  await expect(page.locator('#gdPg .gm-n').last()).toBeInViewport();
  expect(await page.evaluate(() => { const r = document.querySelector('#gdPg .gm-track'); return r.scrollWidth <= r.clientWidth + 1; })).toBe(true);
  // past due: counts the days over, never "0 days left"
  await expect(page.locator('#gdPg .gb-stats')).toContainText('days past due');
  // the card opens on Next; a quick double tap on Mark done ticks it once
  await expect(page.locator('#gdPg .gm-card .gm-tag')).toHaveText('Next');
  await page.locator('#gdPg .gm-card [data-gtk]').dblclick();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms.filter(m => m.done).length)).toBe(4);
  // "+ Milestone" opens the add field and focuses it
  await page.locator('#gdPg [data-gaddms]').click();
  await expect(page.locator('#gMsIn')).toBeFocused();
  await page.keyboard.type('Extra step');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.goals[0].ms.length)).toBe(7);
  await page.keyboard.press('Escape'); // closes the add row, not the page
  await expect(page.locator('#gMsIn')).toHaveCount(0);
  await expect(page.locator('#gdPg')).toHaveClass(/on/);
  await page.evaluate(() => { S.goals[0].ms.pop(); save(); render(); });
  // tapping a milestone (track or hill dot) opens its card and never ticks it
  const before = await page.evaluate(() => S.goals[0].ms.map(m => !!m.done));
  await page.locator('#gdPg .gm-n[data-gsel="m1"]').click();
  await expect(page.locator('#gdPg .gm-card .gm-hx b')).toHaveText('Step 2');
  await page.evaluate(() => document.querySelector('#gdPg .gb-svg [data-gsel="m5"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect(page.locator('#gdPg .gm-card .gm-hx b')).toHaveText('Step 6');
  expect(await page.evaluate(() => S.goals[0].ms.map(m => !!m.done))).toEqual(before);
  // milestones are parent tasks: the last task done ticks it; reopening a task reopens it;
  // marking it done finishes its open tasks; reopening the milestone leaves its tasks as they are
  await page.fill('#gMtIn', 'A');
  await page.keyboard.press('Enter');
  await page.fill('#gMtIn', 'B');
  await page.keyboard.press('Enter');
  await expect(page.locator('#gdPg .gm-card .gm-t')).toHaveCount(2);
  const st = () => page.evaluate(() => [S.goals[0].ms[5].done, ...['A', 'B'].map(n => S.tasks.find(x => x.ms === 'm5' && x.title === n).stage)]);
  await expect(page.locator('#gdPg .gm-card .gm-tt b')).toHaveText(['A', 'B']); // oldest first, add field at the bottom
  await page.locator('#gdPg .gm-card .gm-t').nth(0).locator('[data-gmt]').click();
  await expect.poll(st).toEqual([false, 'done', 'week']);
  await page.waitForTimeout(450);
  await page.locator('#gdPg .gm-card .gm-t').nth(1).locator('[data-gmt]').click();
  await expect.poll(st).toEqual([true, 'done', 'done']);
  await expect(page.locator('#gdPg .gm-card .gm-tag')).toContainText('Done'); // the moment shows on the same card
  await page.evaluate(() => { const x = S.tasks.find(y => y.title === 'B'); commit(() => setStage(x, 'week'), 'x'); });
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
  await expect(page.locator('#gdPg .gb-stats [data-gwin]')).toBeVisible();
  await expect(page.locator('#gdPg .gb-pace')).toHaveCount(0);
  // poster and path: past due wording
  await page.evaluate(() => { S.goals[0].ms[5].done = false; S.goals[0].view = 'poster'; save(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gpo-num')).toContainText('days past due.');
  await page.evaluate(() => { S.goals[0].view = 'path'; S.goals[0].due = ''; save(); openGoal('g1'); });
  await expect(page.locator('#gdPg .gpv-meta')).not.toContainText('days left');
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
