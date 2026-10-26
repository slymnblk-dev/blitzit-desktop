// Inbox: tasks and notes. Capture either kind, edit a note in a calm popup
// (it saves as you type), pin it, turn it into a task, delete it. Notes never reach a board.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('inbox: add tasks and notes, filter, edit, pin, turn into a task, delete', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.inbox = true; S.tasks = S.tasks.filter(t => !t.inbox); save(); openInbox(); });
  // a task, as before
  await page.fill('#ibNew', 'Call the bank');
  await expect(page.locator('#inboxPg .ib-cap')).toHaveClass(/typed/); // the ↑ shows once there is text
  await page.keyboard.press('Enter');
  await expect(page.locator('#inboxPg .ib-list .row')).toHaveCount(1);
  // a note: Enter makes a new line, Ctrl+Enter adds it
  await page.locator('#inboxPg [data-ibswap]').click(); // the small chip at the end switches Task ↔ Note
  await expect(page.locator('#inboxPg textarea#ibNew')).toBeFocused();
  await page.keyboard.type('Gift ideas');
  await page.keyboard.press('Enter');
  await page.keyboard.type('A good book');
  await page.keyboard.press('Control+Enter');
  const n = await page.evaluate(() => S.tasks.find(t => t.note));
  expect([n.title, n.notes, n.inbox, n.list]).toEqual(['Gift ideas', 'Gift ideas\nA good book', true, null]);
  await expect(page.locator('#inboxPg .ib-note b')).toHaveText('Gift ideas');
  expect(await page.evaluate(() => [inboxItems().length, inboxNotes().length, S.tasks.filter(t => t.note && shown(t)).length])).toEqual([1, 1, 0]);
  // no filters: Tasks and Notes each have a quiet header with a count
  await expect(page.locator('#inboxPg .ib-tabs')).toHaveCount(0);
  await expect(page.locator('#inboxPg .ib-count')).toHaveText(['Tasks1', 'Notes1']);
  await expect(page.locator('#inboxPg .ib-cap')).not.toHaveClass(/typed/); // the ↑ hides while the line is empty
  // edit in the popup: it saves as you type; pin it
  await page.locator('#inboxPg .ib-note').click();
  await expect(page.locator('#nbEd')).toHaveClass(/on/);
  await page.locator('#nbText').press('End');
  await page.keyboard.type(' and tea');
  await page.locator('#nbPin').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#nbEd')).not.toHaveClass(/on/);
  await expect(page.locator('#inboxPg')).toHaveClass(/on/); // Escape closed only the note
  expect(await page.evaluate(() => { const t = S.tasks.find(x => x.note); return [t.notes, t.pin]; })).toEqual(['Gift ideas\nA good book and tea', true]);
  await expect(page.locator('#inboxPg .ib-note.pin')).toHaveCount(1);
  // turn into a task: the first line is the title, the rest its notes
  await page.locator('#inboxPg .ib-note').click();
  await page.locator('#nbTask').click();
  const t = await page.evaluate(() => S.tasks.find(x => x.title === 'Gift ideas'));
  expect([t.note, t.notes, t.inbox]).toEqual([false, 'A good book and tea', true]);
  await expect(page.locator('#inboxPg .ib-list .row')).toHaveCount(2);
  // a note emptied in the editor goes away; a note can be deleted (asks first)
  await page.evaluate(() => { S.tasks.push({ id: 777, title: 'Temp', stage: 'backlog', list: null, est: 0, subs: [], notes: 'Temp', repeat: 'none', inbox: true, note: true, created: Date.now() }); save(); render(); });
  await page.locator('#inboxPg [data-ibnote="777"]').click();
  await page.locator('#nbDel').click();
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(() => S.tasks.some(x => x.id === 777))).toBe(false);
  // ⋯ on a task: turn it into a note (its name becomes the first line); ⋯ on a note: pin, then delete
  const tid = await page.evaluate(() => S.tasks.find(x => x.inbox && !x.note && x.title === 'Call the bank').id);
  await page.locator(`#inboxPg [data-ibm="${tid}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Turn into a note' }).click();
  expect(await page.evaluate(id => { const x = S.tasks.find(y => y.id === id); return [x.note, x.notes]; }, tid)).toEqual([true, 'Call the bank']);
  await page.locator(`#inboxPg [data-ibm="${tid}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Pin to the top' }).click();
  await expect(page.locator('#inboxPg .ib-note.pin')).toHaveCount(1);
  await page.locator(`#inboxPg [data-ibm="${tid}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Delete note' }).click();
  await page.locator('#dlgYes').click();
  expect(await page.evaluate(id => S.tasks.some(x => x.id === id), tid)).toBe(false);
  // the tab bar shows how many tasks wait (notes don't need sorting)
  await page.evaluate(() => { S.tasks.push({ id: 778, title: 'N', stage: 'backlog', list: null, est: 0, subs: [], notes: 'N', repeat: 'none', inbox: true, note: true, created: Date.now() }); save(); closeInbox(); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => goHome());
  await expect(page.locator('#tbInbox .tb-n')).toHaveText('1');
  noErrors(errors);
});
