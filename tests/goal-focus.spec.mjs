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
  await expect(page.locator('.gf-seg')).toHaveCount(3);
  await expect(page.locator('.gf-seg.sel')).toContainText('Run 10 km');
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
  await expect(page.locator('.gf-after .gm-t')).toHaveCount(1);
  await page.locator('[data-gfdone="m2"]').click();
  await expect(page.locator('.gf-after .gm-t')).toHaveCount(2);
  // the strip: look at another milestone
  await page.locator('.gf-seg[data-gsel="m3"]').click();
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('No tasks yet');
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

test('phone: the ⋯ menu offers Sunrise or Focus; Focus shows Up next', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page, null);
  await page.locator('#gdMore').click();
  await expect(page.locator('#gdPop [data-gview="path"]')).toBeVisible();
  await page.locator('#gdPop [data-gview="focus"]').click();
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Long run');
  await page.locator('#gdMore').click();
  await page.locator('#gdPop [data-gview="path"]').click();
  await expect(page.locator('#gdIn .gf')).toHaveCount(0);
  noErrors(errors);
});

test('empty cases: no milestones asks for the first one; all tasks done offers Mark milestone done', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await page.evaluate(() => { S.tasks.filter(t => t.goal === 'gx').forEach(t => { t.stage = 'done'; t.doneAt = Date.now(); }); save(); drawGoal(); });
  await expect(page.locator('.gf-card [data-gtk="m2"]')).toBeVisible();
  await page.evaluate(() => { S.goals[0].ms = []; save(); drawGoal(); });
  await expect(page.locator('.gf-card #gMsIn')).toBeVisible();
  await expect(page.locator('.gf-strip')).toHaveCount(0);
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
  await expect(page.locator('.gf-seg.sel')).toContainText('Chat', { timeout: 4000 }); // and it moves on to the next one
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

test('tapping a finished milestone shows what was done in it (ticked), with a way to reopen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await seed(page, 'focus');
  await page.locator('.gf-seg[data-gsel="m1"]').click();
  await expect(page.locator('.gf-card .gf-tt')).toHaveText('Milestone done');
  await expect(page.locator('.gf-card .gf-did .gm-t.on')).toHaveCount(1);
  await expect(page.locator('.gf-card .gf-did')).toContainText('Run 3 km');
  await expect(page.locator('.gf-card .gf-reo')).toBeVisible();
  noErrors(errors);
});
