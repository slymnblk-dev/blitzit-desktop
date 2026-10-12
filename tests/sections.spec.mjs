// Sections (optional): named, foldable groups inside a column. Off by default.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const setup = async page => page.evaluate(() => {
  const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id);
  for (let i = 0; i < 4; i++) S.tasks.push(newTask('Sec task ' + i, 'today', l.id, 30));
  openSpaceSide(sp.id); return sp.id;
});
const turnOn = async page => {
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await page.locator('[data-tg="sections"]').click();
  await page.evaluate(() => closeSettings());
};

test('desktop: off by default; turn on, create, drag a task in, fold, rename, delete', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const spId = await setup(page);
  const today = page.locator('.col[data-s="today"]');
  await expect(today.locator('.ca-sec')).toBeHidden();                          // off by default
  await today.hover();
  await turnOn(page);
  await today.locator('.ca-sec').click();
  await page.keyboard.type('Deep work');
  await page.keyboard.press('Enter');
  await expect(today.locator('.sec-h .sec-n')).toHaveText('Deep work');
  // drag the first task below the section header
  const row = today.locator('.row').first(), id = await row.getAttribute('data-id');
  const head = today.locator('.sec-h');
  await row.locator('.row-in').hover();
  await page.mouse.down();
  const hb = await head.boundingBox();
  await page.mouse.move(hb.x + 40, hb.y + hb.height + 30, { steps: 8 });
  await page.mouse.move(hb.x + 40, hb.y + hb.height + 34, { steps: 2 });
  await page.mouse.up();
  const secId = await page.evaluate(id => S.tasks.find(t => t.id === +id).sec, id);
  expect(secId).toBeTruthy();
  await expect(head.locator('.sec-c')).toHaveText('1');
  // fold
  await head.locator('.sec-tg').click();
  await expect(today.locator(`.row[data-id="${id}"]`)).toHaveCount(0);
  await today.locator('.sec-h .sec-tg').click();
  await expect(today.locator(`.row[data-id="${id}"]`)).toHaveCount(1);
  // rename
  await today.locator('.sec-h .sec-more').click({ force: true });
  await page.locator('#secPop [data-secren]').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Calls');
  await page.keyboard.press('Enter');
  await expect(today.locator('.sec-h .sec-n')).toHaveText('Calls');
  // delete: asks, tasks stay
  const before = await page.evaluate(() => S.tasks.length);
  await today.locator('.sec-h .sec-more').click({ force: true });
  await page.locator('#secPop [data-secdel]').click();
  await expect(page.locator('#dlg')).toHaveClass(/on/);
  await page.locator('#dlgYes').click();
  await expect(today.locator('.sec-h')).toHaveCount(0);
  expect(await page.evaluate(() => S.tasks.length)).toBe(before);
  expect(await page.evaluate(spId => (S.spaces.find(s => s.id === spId).secs || []).length, spId)).toBe(0);
  noErrors(errors);
});

test('phone: new section from the list, add a task to it from task details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await setup(page);
  await page.evaluate(() => { S.stage = 'today'; render(); });
  await turnOn(page);
  await page.locator('#list [data-secnew]').click();
  await page.keyboard.type('Errands');
  await page.keyboard.press('Enter');
  await expect(page.locator('#list .sec-h .sec-n')).toHaveText('Errands');
  const id = await page.locator('#list .row').first().getAttribute('data-id');
  await page.evaluate(id => openDetail(+id), id);
  await page.locator('#dPills [data-p="sec"]').click();
  await page.locator('#dPicker .pk', { hasText: 'Errands' }).click();
  await expect(page.locator('#dPills [data-p="sec"]')).toContainText('Errands');
  await page.evaluate(() => closeSheets());
  await expect(page.locator('#list .sec-h .sec-c')).toHaveText('1');
  // a task in a section that moves to another column becomes loose there
  const loose = await page.evaluate(id => { const t = S.tasks.find(x => x.id === +id); setStage(t, 'week'); return secOfTask(t); }, id);
  expect(loose).toBeNull();
  noErrors(errors);
});

test('space ⋯ menu still opens on Home', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.space = null; render(); });
  const btn = page.locator('#homeView .sp-more').first();
  await btn.click();
  await expect(page.locator('#homeView .sp-pop').first()).toBeVisible();
  noErrors(errors);
});

test('desktop: Add task / Section appear only when the column is hovered', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { openSpaceSide(S.spaces[0].id); });
  const op = sel => page.locator(sel).evaluate(e => +getComputedStyle(e).opacity);
  await page.mouse.move(700, 880);
  await page.waitForTimeout(300);
  expect(await op('.col[data-s="week"] .col-add')).toBe(0);
  await page.locator('.col[data-s="week"] .col-list').hover();
  await page.waitForTimeout(300);
  expect(await op('.col[data-s="week"] .col-add')).toBe(1);
  expect(await op('.col[data-s="backlog"] .col-add')).toBe(0);
  noErrors(errors);
});

test('tuck away finished tasks: Done shows one "Completed" section, off by default', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { const l = S.lists[0]; for (let i = 0; i < 3; i++) { const t = newTask('Fin ' + i, 'done', l.id, 30); t.doneAt = Date.now(); S.tasks.push(t) } S.space = 'all'; render(); });
  const done = page.locator('.col[data-s="done"]');
  expect(await done.locator('.row').count()).toBeGreaterThanOrEqual(3);          // off: all finished tasks show
  await expect(done.locator('.sec-h')).toHaveCount(0);
  await page.evaluate(() => { openSettings(); setView = 'tasks'; drawSettings(); });
  await page.locator('[data-tg="doneFold"]').click();
  await page.evaluate(() => closeSettings());
  await expect(done.locator('.sec-h .sec-n')).toHaveText('Completed');
  await expect(done.locator('.row')).toHaveCount(0);                              // tucked away
  await done.locator('.sec-tg').click();
  expect(await done.locator('.row').count()).toBeGreaterThanOrEqual(3);          // opens on click
  await done.locator('.sec-tg').click();
  await expect(done.locator('.row')).toHaveCount(0);
  noErrors(errors);
});
