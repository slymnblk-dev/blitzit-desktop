// Modes → Projects: off by default and invisible. Numbers projects (sunrise gauges, quick +1, pace coach, Flow view,
// scoreboard) and Phases projects (only the current phase's tasks, finish phase). Lens in spaces, task chip + pill,
// sync/backup/undo, turning off hides everything but keeps data.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('projects: numbers project from a starter, gauges, +1, pace coach, flow, lens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => projectsOn())).toBe(false);
  await page.evaluate(() => openSpace(S.spaces[0].id));
  await expect(page.locator('#mLens')).toBeHidden();

  // turn on, then New project from a starter pick
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-tg="projects"]').click();
  await expect.poll(() => page.evaluate(() => projectsOn())).toBe(true);
  await page.evaluate(() => closeSettings());
  await page.evaluate(() => openSetupP(S.spaces[0].id));
  await expect(page.locator('#psPg')).toHaveClass(/on/);
  await expect(page.locator('#psGo')).toBeDisabled();
  await page.locator('[data-pst="0"]').click(); // Outreach
  await expect(page.locator('#psName')).toHaveValue('Outreach');
  await expect(page.locator('.ps-row')).toHaveCount(4);
  await page.locator('#psGo').click();
  await expect(page.locator('#pjPg')).toHaveClass(/on/);
  const p = await page.evaluate(() => S.projects[0]);
  expect(p.kind).toBe('numbers');
  expect(p.metrics.map(m => [m.name, m.target])).toEqual([['Emails', 100], ['Calls', 50], ['Meetings', 8], ['Deals', 3]]);

  // four sunrise gauges; +1 logs instantly
  await expect(page.locator('#pjPg .pj-gc')).toHaveCount(4);
  await page.locator('#pjPg .pj-gc').nth(3).locator('.pj-plus').click(); // Deals +1
  await expect(page.locator('#pjPg .pj-gc').nth(3).locator('.gn')).toHaveText('1');
  expect(await page.evaluate(() => S.projects[0].metrics[3].log[today()])).toBe(1);
  await page.locator('#pjPg .pj-gc').nth(3).locator('.pj-plus').click();
  await page.locator('#pjPg .pj-gc').nth(3).locator('.pj-plus').click();
  await expect(page.locator('#pjPg .pj-gc').nth(3)).toHaveClass(/hit/); // 3 of 3: the sun is up

  // pace coach for a number: chart, coach line, logging
  await page.locator('#pjPg .pj-gc').nth(1).locator('.pj-gb').click(); // Calls
  await expect(page.locator('#pjPg .pj-pace')).toBeVisible();
  await expect(page.locator('#pjPg .pj-coach')).toContainText('a day');
  await page.locator('#pjPg [data-pjlog="1"]').click();
  await page.fill('#pjLogIn', '4');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.projects[0].metrics[1].log[today()])).toBe(5);
  await expect(page.locator('#pjPg .pj-lv b')).toHaveText('5');
  await page.locator('#pjPg [data-pjlog="-1"]').click();
  await expect(page.locator('#pjPg .pj-lv b')).toHaveText('4');
  await page.locator('#pjBack').click(); // back to the project
  await expect(page.locator('#pjPg .pj-gc')).toHaveCount(4);

  // Flow view: numbers as steps, the weak step called out
  await page.locator('#pjPg [data-pview="flow"]').click();
  await expect(page.locator('#pjPg .pj-fb')).toHaveCount(4);
  expect(await page.evaluate(() => S.projects[0].view)).toBe('flow');
  await page.locator('#pjBack').click();
  await expect(page.locator('#pjPg')).not.toHaveClass(/on/);

  // the space gets a Projects lens
  await expect(page.locator('#mLens [data-lens="projects"]')).toBeVisible();
  await page.locator('#mLens [data-lens="projects"]').click();
  await expect(page.locator('#hbView .pj-card')).toHaveCount(1);
  await page.locator('#hbView .pj-card').click();
  await expect(page.locator('#pjPg')).toHaveClass(/on/);
  noErrors(errors);
});

test('projects: phases show only the current phase, tasks link, finish phase; off hides all', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.projects = true; save(); render(); openSetupP(S.spaces[0].id); });
  await page.locator('[data-psk="phases"]').click();
  await page.fill('#psName', 'App launch');
  await expect(page.locator('.ps-row')).toHaveCount(3); // Plan, Build, Launch
  await page.locator('#psGo').click();
  await expect(page.locator('#pjPg .pj-phs > div')).toHaveCount(3);
  // add a task to the current phase (Plan)
  await page.fill('#pjTaskIn', 'Write the brief');
  await page.keyboard.press('Enter');
  const t = await page.evaluate(() => S.tasks.find(x => x.title === 'Write the brief'));
  const p = await page.evaluate(() => S.projects[0]);
  expect(t.proj).toBe(p.id);
  expect(t.phase).toBe(p.phases[0].id);
  expect(t.stage).toBe('week');
  await expect(page.locator('#pjPg .pj-tr')).toHaveCount(1);
  // tick it → phase complete card → next phase
  await page.locator('#pjPg [data-pjt]').click();
  await expect.poll(() => page.evaluate(id => S.tasks.find(x => x.id === id).stage, t.id)).toBe('done');
  await expect(page.locator('#pjPg .gd-next.sum')).toBeVisible();
  await page.locator('#pjPg .gd-next [data-phdone]').click();
  await expect.poll(() => page.evaluate(() => S.projects[0].phases[0].done)).toBe(true);
  await expect(page.locator('#pjPg .pj-tr')).toHaveCount(0); // Build has no tasks yet; Plan's task is out of sight
  await page.locator('#pjBack').click();

  // task chip on rows + Project pill in details
  await page.evaluate(() => { const x = S.tasks.find(y => y.title === 'Write the brief'); setStage(x, 'week'); save(); openSpace(S.spaces[0].id); S.stage = 'week'; render(); });
  await expect(page.locator('#list .pj-st').first()).toBeVisible();
  await page.evaluate(id => openDetail(id), t.id);
  await expect(page.locator('#dPills [data-p="proj"]')).toContainText('App launch');
  await page.locator('#dPills [data-p="proj"]').click();
  await expect(page.locator('#dPicker .pk')).toHaveCount(4); // None + 3 phases
  await page.locator('#dPicker .pk').first().click();
  expect(await page.evaluate(id => S.tasks.find(x => x.id === id).proj, t.id)).toBeUndefined();
  await page.evaluate(() => closeSheets());

  // turning Projects off hides every trace; data stays
  await page.evaluate(() => { S.cfg.projects = false; save(); render(); });
  await expect(page.locator('#mLens')).toBeHidden();
  expect(await page.evaluate(() => S.projects.length)).toBe(1);
  noErrors(errors);
});

test('projects: pace maths, scoreboard, sync/backup/undo, desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => {
    S.cfg.projects = true; const sp = S.spaces[0].id, log = {};
    for (let i = 1; i <= 60; i++) { const d = new Date(); d.setDate(d.getDate() - i); log[dkey(d)] = 10; }
    S.projects = [{ id: 'p1', name: 'Writing', e: '✍️', space: sp, kind: 'numbers', period: 'week', created: Date.now() - 70 * 864e5,
      metrics: [{ id: 'k1', name: 'Words', target: 50, log }], phases: [] }];
    save(); render();
  });
  // pace: target minus what's done, spread over the days left
  const c = await page.evaluate(() => { const p = S.projects[0], m = p.metrics[0], x = mPace(p, m); return { v: x.v, need: x.need, perDay: x.perDay, left: x.left }; });
  expect(c.need).toBe(Math.max(0, 50 - c.v));
  expect(c.perDay).toBe(Math.ceil(c.need / c.left));
  // scoreboard: 70 a week beats 50 → past weeks are hits
  await page.evaluate(() => openProject('p1'));
  await expect(page.locator('#pjPg .pj-heat i.h').first()).toBeVisible();
  await expect(page.locator('#pjPg .pj-best')).toContainText('weeks straight');
  await expect(page.locator('#pjPg .gd-cols')).toHaveCSS('display', 'grid');
  // sync, backup, undo
  expect(await page.evaluate(() => localDoc().projects.length)).toBe(1);
  expect(await page.evaluate(() => JSON.parse(backupData()).projects.length)).toBe(1);
  await page.locator('#pjMore').click();
  await page.locator('#pjPop [data-pm="del"]').click();
  await page.locator('#dlgYes').click();
  await expect.poll(() => page.evaluate(() => S.projects.length)).toBe(0);
  await page.locator('#undoBtn').click();
  await expect.poll(() => page.evaluate(() => S.projects.length)).toBe(1);
  // desktop lens
  await page.evaluate(() => { openSpace(S.spaces[0].id); S.lens = { [S.spaces[0].id]: 'projects' }; render(); });
  await expect(page.locator('#hbDesk .pj-card')).toHaveCount(1);
  noErrors(errors);
});
