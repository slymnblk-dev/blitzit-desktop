// Inbox: add ideas with steps, send to a list's Backlog. Limits: 10 per stage per list, 10 steps per task.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('inbox: capture, steps, send to backlog; hidden everywhere else; can be turned off', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.locator('#sInbox').click();
  await expect(page.locator('#inboxPg')).toHaveClass(/on/);
  await page.fill('#ibNew', 'Start a podcast'); await page.press('#ibNew', 'Enter');
  await expect(page.locator('.ib-r')).toHaveCount(1);
  await expect(page.locator('#sInbox .n')).toHaveText('1');
  // inbox ideas don't show on boards or in counts
  expect(await page.evaluate(() => S.tasks.filter(shown).some(t => t.title === 'Start a podcast'))).toBe(false);
  // opens the same details sheet as a task: add 10 steps, no more
  await page.locator('.ib-r .row-in .title').first().click();
  await expect(page.locator('#detailSheet')).toHaveClass(/on/);
  for (let i = 0; i < 11; i++) { await page.fill('#dSubIn', 'Step ' + i); await page.press('#dSubIn', 'Enter'); }
  expect(await page.evaluate(() => S.tasks.find(t => t.title === 'Start a podcast').subs.length)).toBe(10);
  // send to a list
  await page.locator('#dComplete').click();
  const l = await page.evaluate(() => S.lists[0].id);
  await page.locator(`#dPicker .pk[data-v="${l}"]`).click();
  await expect.poll(() => page.evaluate(() => { const t = S.tasks.find(x => x.title === 'Start a podcast'); return t && !t.inbox && t.stage === 'backlog' && t.list; })).toBe(l);
  await expect(page.locator('.ib-r')).toHaveCount(0);
  // turn it off
  await page.evaluate(() => { setCfg('inbox', false); render(); });
  await expect(page.locator('#sInbox')).toHaveCount(0);
  await expect(page.locator('#inboxPg')).not.toHaveClass(/on/);
  noErrors(errors);
});

test('limits: max 10 per stage in a list, max 10 steps per task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const l = S.lists[0], n = stageCount(l.id, 'week');
    for (let i = n; i < STAGE_MAX; i++) S.tasks.push(newTask('Fill ' + i, 'week', l.id, 30));
    save(); return { l: l.id, room: stageRoom(l.id, 'week'), today: stageRoom(l.id, 'today') };
  });
  expect(r.room).toBe(false);
  expect(r.today).toBe(true);
  // moving another task into the full stage is refused
  const moved = await page.evaluate(l => { const t = S.tasks.find(x => shown(x) && x.list === l && x.stage === 'today'); const ok = canPut(t.list, 'week', t); return ok; }, r.l);
  expect(moved).toBe(false);
  await expect(page.locator('#capDlg')).toHaveClass(/on/);                         // a clear card in the middle (0.298)
  await expect(page.locator('#capP')).toContainText('already has 10');
  await expect(page.locator('#capInbox')).toBeHidden();                             // moving a task: nothing to send to the Inbox
  await page.waitForTimeout(3000);
  await expect(page.locator('#capDlg')).toHaveClass(/on/);                         // stays until you close it
  await page.locator('#capOk').click();
  await expect(page.locator('#capDlg')).not.toHaveClass(/on/);
  // steps
  const steps = await page.evaluate(() => { const t = S.tasks.find(shown); t.subs = Array.from({ length: 10 }, (_, i) => ({ id: newId(), t: 's' + i, done: false })); return canStep(t); });
  expect(steps).toBe(false);
  noErrors(errors);
});

test('adding a new task to a full column offers to keep it in the Inbox (0.298)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page);
  const l = await page.evaluate(() => { const sp = S.spaces[0], l = S.lists.find(x => x.space === sp.id); openSpaceSide(sp.id); S.list = l.id;
    const n = stageCount(l.id, 'backlog'); for (let i = n; i < STAGE_MAX; i++) S.tasks.push(newTask('Fill ' + i, 'backlog', l.id, 30)); S.cfg.inbox = true; save(); render(); return l.id; });
  const inp = page.locator('.col[data-s="backlog"] .ca-in');
  await page.locator('.col[data-s="backlog"]').hover();
  await page.evaluate(() => { const b = document.querySelector('.col[data-s="backlog"] .ca-btn,.col[data-s="backlog"] [data-colad]'); if (b) b.click(); });
  if (!(await inp.isVisible())) await page.evaluate(() => { const i = document.querySelector('.col[data-s="backlog"] .ca-in'); i.closest('.ca, .col-add') && i.closest('.ca, .col-add').classList.add('on'); });
  await inp.fill('Buy stamps');
  await inp.press('Enter');
  await expect(page.locator('#capDlg')).toHaveClass(/on/);
  await expect(page.locator('#capTask')).toHaveText('Buy stamps');
  await page.locator('#capInbox').click();
  await expect.poll(() => page.evaluate(() => { const t = S.tasks.find(x => x.title === 'Buy stamps'); return t && [!!t.inbox, t.list]; })).toEqual([true, null]);
  await expect(inp).toHaveValue('');
  noErrors(errors);
});

test('the add card: a full stage keeps the task in the Inbox and closes the card', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { const l = S.lists[0]; const n = stageCount(l.id, 'today'); for (let i = n; i < STAGE_MAX; i++) S.tasks.push(newTask('F' + i, 'today', l.id, 30)); S.cfg.defList = l.id; S.cfg.inbox = true; save(); goHome(); document.getElementById('addBtn').click(); });
  await page.evaluate(id => { draft.space = listOf(id).space; draft.list = id; draft.stage = 'today'; drawAdd(); }, await page.evaluate(() => S.lists[0].id));
  await page.locator('#newTitle').fill('Call the bank');
  await page.locator('#saveBtn').click();
  await expect(page.locator('#capDlg')).toHaveClass(/on/);
  await page.locator('#capInbox').click();
  await expect.poll(() => page.evaluate(() => !!(S.tasks.find(x => x.title === 'Call the bank') || {}).inbox)).toBe(true);
  await expect(page.locator('#addSheet.on')).toHaveCount(0);
  noErrors(errors);
});
