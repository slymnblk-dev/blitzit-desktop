// Goal page · Focus view (0.292): goal › milestones › tasks › steps, built around "Up next". Phone and computer.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const seed = (page, view) => page.evaluate(v => {
  S.cfg.goals = true; const l = S.lists[0].id;
  S.goals = [{ id: 'gx', name: 'Run a half marathon', e: '', space: null, why: 'Finish what I start.', due: '2027-04-12', created: Date.now(), ...(v ? { view: v } : {}),
    ms: [{ id: 'm1', t: 'Run 5 km', done: true, doneAt: Date.now() - 9e8, items: [{ id: 1, t: 'Run 3 km', done: true }] },
         { id: 'm2', t: 'Run 10 km', items: [{ id: 3, t: 'Buy shoes', done: true }] }, { id: 'm3', t: 'Run 15 km', items: [] }] }];
  const mk = (id, title, subs) => { const t = newTask(title, 'week', l, 30); t.id = id; t.goal = 'gx'; t.ms = 'm2'; t.subs = subs; S.tasks.push(t); };
  mk(9001, 'Long run', [{ id: 1, t: 'Warm up', done: true }, { id: 2, t: 'Run 8 km', done: false }]);
  mk(9002, 'Physio', []);
  save(); applySettings(); openGoal('gx');
}, view);

test('computer: pick Focus in the ⋯ menu; Up next shows the next task and its steps; Today, steps and the strip work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await seed(page, null);
  await page.locator('#gdMore').click();
  await page.locator('[data-gview="focus"]').click();
  await expect(page.locator('#gdIn .gf')).toBeVisible();
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Long run');
  await expect(page.locator('.gf-card .gf-st')).toHaveCount(2);
  await expect(page.locator('.gf-dot')).toHaveCount(3);                      // milestone first (0.299)
  await expect(page.locator('.gf-mt b')).toHaveText('Run 10 km');
  await expect(page.locator('.gf-mn')).toHaveText(/Milestone 2 of 3/i);
  // tick a step
  await page.locator('.gf-card [data-gsub="t9001|2"]').click();
  await expect.poll(() => page.evaluate(() => S.tasks.find(t => t.id === 9001).subs[1].done)).toBe(true);
  // add a step
  await page.locator('.gf-card [data-gsadd="t9001"]').fill('Stretch');
  await page.locator('.gf-card [data-gsadd="t9001"]').press('Enter');
  await expect.poll(() => page.evaluate(() => S.tasks.find(t => t.id === 9001).subs.length)).toBe(3);
  // Today moves the task to Today
  await page.locator('[data-gftoday="9001"]').click();
  await expect.poll(() => page.evaluate(() => S.tasks.find(t => t.id === 9001).stage)).toBe('today');
  await expect(page.locator('[data-gftoday]')).toHaveCount(0);                 // already in Today: the button goes away
  // "Then in …" lists the other open tasks; done ones fold under "1 done"
  await expect(page.locator('.gf-after .gm-t')).toHaveCount(3);                // one list: every task of the milestone
  await expect(page.locator('.gf-after .gm-t.gf-nx')).toHaveCount(1);          // the next one is marked
  // the strip: look at another milestone
  await page.locator('[data-gfnav="1"]').click();                              // › to the next milestone
  await expect(page.locator('.gf-mt b')).toHaveText('Run 15 km');
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Add the first task');
  await expect(page.locator('.gf-card #gMtIn')).toBeVisible();
  // remembered for this goal
  expect(await page.evaluate(() => S.goals[0].view)).toBe('focus');
  noErrors(errors);
});

test('Start now opens focus mode on that task', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await page.locator('[data-gfgo="9001"]').click();
  await expect(page.locator('#focus')).toHaveClass(/on/);
  noErrors(errors);
});

test('phone: Focus is the only goal view (Sunrise and Countdown are gone, 0.301); saved old views open in Focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page, 'path');
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Long run');
  expect(await page.evaluate(() => S.goals[0].view)).toBe('focus');
  await page.locator('#gdMore').click();
  await expect(page.locator('#gdPop [data-gview]')).toHaveCount(0);
  noErrors(errors);
});

test('computer: the View menu has only The climb and Focus; an old Countdown goal opens in Focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await seed(page, 'poster');
  await expect(page.locator('#gdIn .gf')).toBeVisible();
  await page.locator('#gdMore').click();
  expect(await page.locator('#gdPop [data-gview]').evaluateAll(b => b.map(x => x.dataset.gview))).toEqual(['climb', 'focus']);
  noErrors(errors);
});

test('empty cases: no milestones asks for the first one; all tasks done offers Mark milestone done', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await page.evaluate(() => { S.tasks.filter(t => t.goal === 'gx').forEach(t => { t.stage = 'done'; t.doneAt = Date.now(); }); save(); drawGoal(); });
  await expect(page.locator('.gf-card [data-gffin="m2"]')).toBeVisible();          // Finish milestone (0.299)
  await page.evaluate(() => { S.goals[0].ms = []; save(); drawGoal(); });
  await expect(page.locator('.gf-card #gMsIn')).toBeVisible();
  await expect(page.locator('.gf-mh')).toHaveCount(0);
  noErrors(errors);
});

test('phone: Mark task done works for a task that lives only in the goal, and the next one moves up (0.293 fix)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true;
    S.goals = [{ id: 'gy', name: 'Learn Spanish', e: '', space: null, due: '2027-02-01', created: Date.now(), view: 'focus',
      ms: [{ id: 'a', t: 'Learn 100 words', items: [{ id: 1, t: 'Install an app', done: false }, { id: 2, t: '10 words a day', done: false }] }, { id: 'b', t: 'Chat', items: [] }] }];
    save(); applySettings(); openGoal('gy'); });
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Install an app');
  await page.locator('.gf-card .gf-go').click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[0].items[0].done)).toBe(true);
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('10 words a day');
  await page.locator('.gf-card .gf-go').click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[0].done)).toBe(true);   // last task done: the milestone is done
  await expect(page.locator('.gf-mt b')).toHaveText('Chat', { timeout: 4000 });     // and it moves on to the next one
  noErrors(errors);
});

test('Start is the main action for a task; once every step is ticked, Mark task done takes its place', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await expect(page.locator('.gf-card .gf-go')).toContainText('Start');
  await page.locator('.gf-card [data-gsub="t9001|2"]').click();
  await expect(page.locator('.gf-card .gf-go')).toContainText('Mark task done');
  await expect(page.locator('.gf-sh small')).toHaveText('2 of 2');
  noErrors(errors);
});

test('a finished milestone shows what you did; opening it again asks first; every task ticked offers Finish milestone (0.299)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await page.locator('.gf-dot[data-gsel="m1"]').click();
  await expect(page.locator('.gf-fin')).toContainText('Finished');
  await expect(page.locator('.gf-ah')).toHaveText('What you did');
  await expect(page.locator('.gf-after .gm-t.on')).toHaveCount(1);
  await expect(page.locator('.gf-after')).toContainText('Run 3 km');
  // open it again: asked first, tasks stay ticked
  await page.locator('[data-gfreo]').click();
  await expect(page.locator('#gfReoP')).toContainText('stays ticked');
  await page.locator('#gfReoKeep').click();
  await expect.poll(() => page.evaluate(() => [S.goals[0].ms[0].done, S.goals[0].ms[0].items[0].done])).toEqual([false, true]);
  // every task ticked → one clear Finish milestone
  await expect(page.locator('[data-gffin="m1"]')).toBeVisible();
  await page.locator('[data-gffin="m1"]').click();
  await expect.poll(() => page.evaluate(() => S.goals[0].ms[0].done)).toBe(true);
  noErrors(errors);
});

test('opening a milestone again can also untick its tasks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await page.locator('.gf-dot[data-gsel="m1"]').click();
  await page.locator('[data-gfreo]').click();
  await page.locator('#gfReoAll').click();
  await expect.poll(() => page.evaluate(() => [S.goals[0].ms[0].done, S.goals[0].ms[0].items[0].done])).toEqual([false, false]);
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Run 3 km');
  noErrors(errors);
});
