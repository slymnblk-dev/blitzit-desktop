// Vision board: an optional mode (0.309). Board per year, photo / quote / word / goal cards, Morning look, Home card, wallpaper.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const phone = page => page.setViewportSize({ width: 390, height: 844 });
const desk = page => page.setViewportSize({ width: 1400, height: 900 });
// a tiny real PNG (2x2) to upload
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64');
const on = (page, extra = {}) => page.evaluate(x => { Object.assign(S.cfg, { vision: true, motion: false }, x); save(); applySettings(); goHome(); }, extra);
const cards = page => page.evaluate(() => S.vision.map(c => [c.k, c.t]));

test('off by default; Settings → Modes (Beta) turns it on: a phone tab and a sidebar item on computers', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  expect(await page.evaluate(() => [!!S.cfg.vision, tabsList().some(t => t[0] === 'vision')])).toEqual([false, false]);
  await page.evaluate(() => { openSettings(); setView = 'modes'; drawSettings(); });
  await page.locator('#setIn [data-btgrp]').click();
  await page.locator('#setIn .md-card[data-md="vision"] [data-tg="vision"]').click();
  await expect.poll(() => page.evaluate(() => S.cfg.vision)).toBe(true);
  await page.evaluate(() => { closeSettings(); goHome(); });
  expect(await page.evaluate(() => tabsList().map(t => t[0]))).toContain('vision');
  await page.evaluate(() => tbGo('vision'));
  await expect(page.locator('#visionPg.on')).toBeVisible();
  await expect(page.locator('#visionPg .vb-empty')).toBeVisible();
  await desk(page);
  await page.evaluate(() => { closeVision(); goHome(); render(); });
  await page.locator('#sVision').click();
  await expect(page.locator('#visionPg.on')).toBeVisible();
  // turning the mode off closes the page; data stays
  await page.evaluate(() => { S.vision.push({ id: 5, k: 'word', t: 'Brave', year: new Date().getFullYear() }); setCfg('vision', false); });
  await expect(page.locator('#visionPg.on')).toHaveCount(0);
  expect(await page.evaluate(() => S.vision.length)).toBe(1);
  noErrors(errors);
});

test('add a quote, a word (only one a year), edit, move and delete with Undo; the + on the board adds a card', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => openVision());
  await page.locator('#visionPg [data-vbnew="quote"]').click();
  await expect(page.locator('#vbSheet.on')).toBeVisible();
  await expect(page.locator('#vbSave')).toBeDisabled();
  await page.locator('#vbText').fill('Small steps, every day.');
  await page.locator('#vbSheet [data-vbc="#7CE0A8"]').click();
  await page.locator('#vbSave').click();
  expect(await page.evaluate(() => [S.vision[0].k, S.vision[0].t, S.vision[0].c])).toEqual(['quote', 'Small steps, every day.', '#7CE0A8']);
  // the + in the tab bar adds a card while on the board
  await page.locator('#tbAdd:visible, #addBtn:visible').first().click();
  await expect(page.locator('#vbSheet.on')).toBeVisible();
  await page.locator('#vbSheet [data-vbk="word"]').click();
  await page.locator('#vbText').fill('Brave');
  await page.keyboard.press('Enter');
  await expect(page.locator('#visionPg .vb-w')).toHaveText('Brave');
  await expect(page.locator('#visionPg .pg-sum')).toContainText('Word of the year: Brave');
  // a second word is not offered
  await page.evaluate(() => openVbCard(null));
  await expect(page.locator('#vbSheet [data-vbk="word"]')).toBeDisabled();
  await page.evaluate(() => closeSheets());
  // edit: tap the card
  await page.locator('#visionPg .vb-quote').click();
  await page.locator('#vbText').fill('Every day, a little.');
  await page.locator('#vbSave').click();
  expect(await page.evaluate(() => S.vision.find(c => c.k === 'quote').t)).toBe('Every day, a little.');
  // move later
  await page.locator('#visionPg .vb-quote').click();
  await page.locator('#vbSheet [data-vbmv="1"]').click();
  expect(await page.evaluate(() => vbCards(vbYear).map(c => c.k))).toEqual(['word', 'quote']);
  // delete, then Undo
  await page.locator('#visionPg .vb-word').click();
  await page.locator('#vbSheet [data-vbdel]').click();
  expect(await cards(page)).toEqual([['quote', 'Every day, a little.']]);
  await page.locator('#undoBtn').click();
  expect((await cards(page)).length).toBe(2);
  noErrors(errors);
});

test('a photo is shrunk, kept on this device, and still there after a reload; other devices see a calm placeholder', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => openVision());
  await page.locator('#visionPg [data-vbnew="photo"]').click();
  await page.locator('#vbFile').setInputFiles({ name: 'beach.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#vbSheet .vb-pick img')).toBeVisible();
  await expect(page.locator('#vbSheet .vb-kb')).toContainText('saved on this device');
  await page.locator('#vbText').fill('Bali, summer');
  await page.locator('#vbSheet [data-vbsz="l"]').click();
  await page.locator('#vbSave').click();
  await expect(page.locator('#visionPg .vb-photo.sz-l img')).toBeVisible();
  const id = await page.evaluate(() => S.vision[0].id);
  // the photo itself never goes into the synced data
  expect(await page.evaluate(() => JSON.stringify(localDoc()).includes('data:image'))).toBe(false);
  expect(await page.evaluate(() => localDoc().vision.length)).toBe(1);
  await page.reload();
  await page.waitForFunction(() => typeof S === 'object');
  await page.evaluate(() => openVision());
  await expect(page.locator('#visionPg .vb-photo img')).toBeVisible();
  // a card whose photo isn't on this device
  await page.evaluate(i => { vbDB.del(i); delete vbImg[i]; drawVision(); }, id);
  await expect(page.locator('#visionPg .vb-miss')).toContainText('Photo is on another device');
  noErrors(errors);
});

test('areas filter the board; a new area can be added; 40 cards is the most', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => { const y = new Date().getFullYear(); S.vision = [{ id: 1, k: 'quote', t: 'Run', area: 'Health', year: y, ord: 0 }, { id: 2, k: 'quote', t: 'Ship', area: 'Career', year: y, ord: 1 }]; save(); openVision(); });
  await page.locator('#visionPg [data-vbarea="Health"]').click();
  await expect(page.locator('#visionPg .vb-quote')).toHaveCount(1);
  await page.locator('#visionPg [data-vbareanew]').click();
  await page.locator('#vbAreaIn').fill('Family');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => [S.cfg.vAreas.includes('Family'), vbArea])).toEqual([true, 'Family']);
  await expect(page.locator('#visionPg .vb-none')).toContainText('Nothing in Family yet');
  await page.evaluate(() => { const y = new Date().getFullYear(); for (let i = 3; i <= 40; i++) S.vision.push({ id: i, k: 'quote', t: 'Q' + i, year: y, ord: i }); save(); vbArea = ''; drawVision(); });
  await expect(page.locator('#visionPg .vb-addc')).toHaveCount(0);
  await page.locator('#visionPg [data-vbnew]').first().click();
  await expect(page.locator('#vbSheet.on')).toHaveCount(0);
  noErrors(errors);
});

test('goal cards show progress and an Achieved stamp; "Also make it a goal" links the new goal', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await on(page, { goals: true });
  await page.evaluate(() => { S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '', space: S.spaces[0].id, why: '', due: '', created: Date.now(), ms: [{ id: 'm0', t: 'A', done: true }, { id: 'm1', t: 'B', done: false }] }]; save(); openVision(); });
  await page.locator('#visionPg [data-vbnew]').first().click();
  await page.locator('#vbSheet [data-vbk="goal"]').click();
  await page.locator('#vbSheet [data-vbg="g1"]').click();
  await page.locator('#vbSave').click();
  await expect(page.locator('#visionPg .vb-goal .vb-gn')).toHaveText('Run a half marathon');
  await expect(page.locator('#visionPg .vb-goal .vb-gs')).toContainText('Next: B');
  await page.evaluate(() => { S.goals[0].done = true; save(); render(); });
  await expect(page.locator('#visionPg .vb-goal .vb-stamp')).toHaveText('Achieved');
  // a quote becomes a goal: the goal setup opens with its words, and the new goal is linked back
  await page.evaluate(() => openVbCard(null, 'quote'));
  await page.locator('#vbText').fill('Learn Spanish');
  await page.locator('#vbSheet [data-vbmk]').click();
  await expect.poll(() => page.evaluate(() => typeof gsOn !== 'undefined' && gsOn)).toBe(true);
  expect(await page.evaluate(() => gsD.name)).toBe('Learn Spanish');
  await page.evaluate(() => { S.goals.push({ id: 'g2', name: 'Learn Spanish', e: '', space: null, why: '', due: '', created: Date.now(), ms: [] }); closeSetup(); render(); });
  expect(await page.evaluate(() => S.vision.find(c => c.t === 'Learn Spanish').g)).toBe('g2');
  noErrors(errors);
});

test('Morning look plays the board full screen (next, pause, Esc); Home shows today\'s vision; wallpaper downloads', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => { const y = new Date().getFullYear(); S.vision = [{ id: 1, k: 'quote', t: 'One', year: y, ord: 0 }, { id: 2, k: 'word', t: 'Brave', year: y, ord: 1 }]; save(); goHome(); render(); });
  await expect(page.locator('#homeView .vb-home')).toBeVisible();
  await page.locator('#homeView .vb-home [data-vbopen]').click();
  await expect(page.locator('#visionPg.on')).toBeVisible();
  await page.locator('#visionPg [data-vbplay]').click();
  await expect(page.locator('#vbShow.on')).toBeVisible();
  await expect(page.locator('#vbShow .vb-top')).toContainText('1 of 2');
  await page.locator('#vbShow [data-vbsp]').click();
  await expect(page.locator('#vbShow [data-vbsp]')).toContainText('Play');
  await page.locator('#vbShow [data-vbsn]').click();
  await expect(page.locator('#vbShow .vb-sw2 b')).toHaveText('Brave');
  await page.keyboard.press('Escape');
  await expect(page.locator('#vbShow.on')).toHaveCount(0);
  await expect(page.locator('#visionPg.on')).toBeVisible();      // Esc closed only the slideshow
  const dl = page.waitForEvent('download');
  await page.locator('#visionPg [data-vbwall]').click();
  expect((await dl).suggestedFilename()).toBe(`vision-${new Date().getFullYear()}.png`);
  // Classic and Flow both draw the board
  await page.evaluate(() => { S.cfg.ui = 'flow'; applySettings(); drawVision(); });
  await expect(page.locator('#visionPg .vb-c[data-vbe]')).toHaveCount(2);
  noErrors(errors);
});

test('boards per year: a new board for next year starts empty; this year keeps its cards', async ({ page }) => {
  await desk(page);
  const errors = await openApp(page);
  await on(page);
  const y = await page.evaluate(() => { const y = new Date().getFullYear(); S.vision = [{ id: 1, k: 'quote', t: 'Now', year: y, ord: 0 }]; save(); openVision(); return y; });
  // the year picker sits where Back would be (no Back on computers: Vision has no parent page)
  await expect(page.locator('#vbBack')).toBeHidden();
  await page.locator('#vbYearBtn').click();
  await expect(page.locator('#visionPg .vb-ym')).toBeVisible();
  await page.keyboard.press('Escape');                                   // closes the menu, not the page
  await expect(page.locator('#visionPg .vb-ym')).toHaveCount(0);
  await expect(page.locator('#visionPg.on')).toBeVisible();
  await page.locator('#vbYearBtn').click();
  await page.locator(`#visionPg .vb-ynew[data-vby="${y + 1}"]`).click();
  await expect(page.locator('#visionPg .vb-empty')).toBeVisible();
  await expect(page.locator('#visionPg .pg-eye')).toHaveText(`Your ${y + 1}`);
  await page.locator('#vbYearBtn').click();
  await page.locator(`#visionPg .vb-ym [data-vby="${y}"]`).click();
  await expect(page.locator('#visionPg .vb-quote')).toHaveCount(1);
  noErrors(errors);
});

test('QA (0.310): the sheet uses chips (no native dropdowns), keeps what you typed, and areas can be removed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await on(page);
  await page.evaluate(() => openVision());
  await expect(page.locator('#visionPg select')).toHaveCount(0);
  await page.locator('#visionPg [data-vbnew="quote"]').click();
  await expect(page.locator('#vbSheet select')).toHaveCount(0);
  await page.locator('#vbText').fill('Keep me');
  await page.locator('#vbSheet [data-vbc="#8FB4FF"]').click();
  await page.locator('#vbSheet [data-vba="Health"]').click();
  await page.locator('#vbSheet [data-vbsz="l"]').click();
  await expect(page.locator('#vbText')).toHaveValue('Keep me');
  await page.locator('#vbSave').click();
  expect(await page.evaluate(() => { const c = S.vision[0]; return [c.t, c.c, c.area, c.size]; })).toEqual(['Keep me', '#8FB4FF', 'Health', 'l']);
  // remove the Health area: the card keeps going, with no area; Undo brings it back
  await page.locator('#visionPg [data-vbarea="Health"]').click();
  await page.locator('#visionPg [data-vbadel="Health"]').click();
  expect(await page.evaluate(() => [vbAreas().includes('Health'), S.vision[0].area])).toEqual([false, '']);
  await page.locator('#undoBtn').click();
  expect(await page.evaluate(() => [vbAreas().includes('Health'), S.vision[0].area])).toEqual([true, 'Health']);
  // a long word fits on one line
  await page.evaluate(() => { S.vision.push({ id: 77, k: 'word', t: 'Extraordinary', year: vbYear, ord: 9 }); save(); vbArea = ''; drawVision(); });
  expect(await page.evaluate(() => { const w = document.querySelector('#visionPg .vb-w'); return w.scrollWidth <= w.parentElement.clientWidth + 1 && w.getClientRects().length === 1; })).toBe(true);
  // phones: with Vision as a tab there's no Back button either
  await expect(page.locator('#vbBack')).toBeHidden();
  noErrors(errors);
});
