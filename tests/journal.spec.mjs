// Journal (optional mode): a morning line, an evening line and a mood each day; Energy check-ins are an optional part.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('phone: off by default; write, mood, past days, clear with undo, sync and backup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await expect(page.locator('#tabBar [data-tab="journal"]')).toHaveCount(0);
  await page.evaluate(() => { S.cfg.journal = true; S.cfg.tabs = ['journal']; save(); applySettings(); goHome(); });
  await page.locator('#tabBar [data-tab="journal"]').click();
  await expect(page.locator('#journalPg')).toHaveClass(/on/);
  await expect(page.locator('#journalPg .pg-sum')).toContainText('0 days written');
  // write the morning line: it saves as you type
  await page.locator('#journalPg [data-jrf="am"]').fill('Send the proposal before lunch');
  await page.locator('#journalPg [data-jrf="pm"]').click();
  expect(await page.evaluate(() => jrGet(today()).am)).toBe('Send the proposal before lunch');
  await page.keyboard.type('Ran 10 km');
  await page.locator('#journalPg [data-jrmood="5"]').click();
  expect(await page.evaluate(() => [jrGet(today()).pm, jrGet(today()).mood])).toEqual(['Ran 10 km', 5]);
  await expect(page.locator('#journalPg .pg-sum')).toContainText('1 day written');
  expect(await page.evaluate(() => [localDoc().journal.length, JSON.parse(backupData()).journal.length])).toEqual([1, 1]);
  // today on the calendar is Great
  await expect(page.locator(`#journalPg .jr-c[data-jrday="${await page.evaluate(() => today())}"]`)).toHaveClass(/jm-great/);
  // a past day: shows in Earlier, opens for editing, back to today
  await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); S.journal.push({ id: 5, d: dkey(d), am: '', pm: 'Too many meetings', mood: 3, en: [] }); save(); drawJournal(); });
  await expect(page.locator('#journalPg .jr-ent')).toContainText('Too many meetings');
  await page.locator('#journalPg .jr-ent').click();
  await expect(page.locator('#journalPg [data-jrf="pm"]')).toHaveValue('Too many meetings');
  await expect(page.locator('#journalPg .jr-mood.on')).toHaveText('OK');
  await page.locator('#journalPg [data-jrtoday]').click();
  await expect(page.locator('#journalPg [data-jrf="pm"]')).toHaveValue('Ran 10 km');
  // clear today from ⋯, then Undo
  await page.locator('#journalPg [data-jrm]').click();
  await page.locator('#cxPop button', { hasText: 'Clear this day' }).click();
  await expect(page.locator('#journalPg [data-jrf="pm"]')).toHaveValue('');
  await page.locator('#undoBtn').click();
  await expect(page.locator('#journalPg [data-jrf="pm"]')).toHaveValue('Ran 10 km');
  // no energy unless turned on
  await expect(page.locator('#journalPg .jr-en')).toHaveCount(0);
  noErrors(errors);
});

test('Energy check-ins (optional): log, then your usual day and best hours; computer layout and Settings', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.journal = true; save(); applySettings(); goHome(); });
  await page.locator('#sJournal').click();
  await expect(page.locator('#journalPg .jr-cal')).toBeVisible();
  await expect(page.locator('#journalPg .jr-en')).toHaveCount(0);
  // turn on Energy from Settings → Modes → Journal
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-btgrp]').click(); // the Beta group starts folded
  await page.locator('#setIn .md-card[data-md="journal"] [data-tg="jEnergy"]').click();
  await expect.poll(() => page.evaluate(() => S.cfg.jEnergy)).toBe(true);
  await page.evaluate(() => { closeSettings(); openJournal(); });
  await page.locator('#journalPg [data-jren="3"]').click();
  expect(await page.evaluate(() => jrGet(today()).en.map(e => e.v))).toEqual([3]);
  await expect(page.locator('#journalPg .jr-eh small')).toContainText('1 check-in today');
  // three weeks of check-ins: high in the morning, a dip after lunch
  await page.evaluate(() => {
    for (let i = 1; i <= 6; i++) { const d = new Date(); d.setDate(d.getDate() - i); const at = h => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x.getTime(); };
      S.journal.push({ id: 100 + i, d: dkey(d), am: '', pm: '', en: [{ at: at(9), v: 3 }, { at: at(10), v: 3 }, { at: at(14), v: 1 }, { at: at(17), v: 2 }] }); }
    save(); drawJournal(); });
  await expect(page.locator('#journalPg .jr-chart')).toBeVisible();
  await expect(page.locator('#journalPg .jr-tip')).toContainText('9:00 – 11:00');
  await expect(page.locator('#journalPg .jr-tip')).toContainText('14:00');
  // the calendar picks a day; Escape goes back
  await page.keyboard.press('Escape');
  await expect(page.locator('#journalPg')).not.toHaveClass(/on/);
  noErrors(errors);
});
