// Full width (computers): the sidebar hides inside a space; the top bar goes home and switches spaces and lists.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('full width: hide sidebar in a space, switch space and list, go home', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('[data-fw="1"]').click();
  expect(await page.evaluate(() => S.cfg.fullWidth)).toBe(true);
  await page.evaluate(() => closeSettings());
  await expect(page.locator('#desk')).not.toHaveClass(/\bfw\b/);              // Home keeps the sidebar
  const [a, b] = await page.evaluate(() => S.spaces.slice(0, 2).map(s => s.id));
  await page.evaluate(id => openSpaceSide(id), a);
  await expect(page.locator('#desk')).toHaveClass(/\bfw\b/);
  await expect(page.locator('.side')).toHaveCSS('opacity', '0');
  await page.locator('[data-fwp]').click();                                   // one menu: switch space
  await page.locator(`.fw-s[data-fwsp="${b}"]`).click();
  expect(await page.evaluate(() => S.space)).toBe(b);
  const lid = await page.evaluate(a => { S.lists.push({ id: 'lfw', name: 'Second', c: '#888', space: a }); render(); return 'lfw'; }, a);
  await page.locator('[data-fwp]').click();                                   // point at another space: its lists show on the right
  await page.locator(`.fw-s[data-fwh="${a}"]`).hover();
  await expect(page.locator('#fwLs .fw-new')).toBeVisible();                   // "New list" sits under its lists
  await page.locator(`[data-fwl="${lid}"]`).click();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual([a, lid]);
  await page.locator('#fwBack').click();                                      // back home
  expect(await page.evaluate(() => S.space)).toBe(null);
  await expect(page.locator('#desk')).not.toHaveClass(/\bfw\b/);
  noErrors(errors);
});

test('full width: on Home, a space in the sidebar unfolds its lists first; a list opens the board', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const r = await page.evaluate(() => { S.cfg.fullWidth = true; S.space = null; applySettings(); render(); const sp = S.spaces[0]; return { sp: sp.id, l: S.lists.find(x => x.space === sp.id).id }; });
  await page.locator(`#sLists [data-sp="${r.sp}"]`).click();
  expect(await page.evaluate(() => S.space)).toBeNull();                          // still on Home
  await expect(page.locator(`#sLists [data-pl="${r.l}"]`)).toBeVisible();
  await page.locator(`#sLists [data-pl="${r.l}"]`).click();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual([r.sp, r.l]);
  noErrors(errors);
});

test('board: Add task opens a task line; Enter adds and leaves a fresh line', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => openSpaceSide(S.spaces[0].id));
  const col = page.locator('.col[data-s="week"]');
  await col.hover();
  await col.locator('.ca-btn').click();
  await expect(col.locator('.ca-btn')).toBeHidden();
  await expect(col.locator('.ca-in')).toBeFocused();
  await page.keyboard.type('First new');
  await page.keyboard.press('Enter');
  await expect(col.locator('.ca-in')).toBeFocused();
  await expect(col.locator('.ca-in')).toHaveValue('');
  await page.keyboard.type('Second new');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => S.tasks.filter(t => /^(First|Second) new$/.test(t.title)).length)).toBe(2);
  await page.keyboard.press('Escape');
  await expect(col.locator('.ca-row')).toBeHidden();
  noErrors(errors);
});

test('full width: a space card on Home opens its lists page; a one-list space opens the board', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  const r = await page.evaluate(() => { S.cfg.fullWidth = true; S.space = null;
    const multi = S.spaces[0]; if (S.lists.filter(l => l.space === multi.id).length < 2) S.lists.push({ id: 'lz', name: 'Extra', c: '#888', space: multi.id });
    S.spaces.push({ id: 'one', name: 'Solo', c: '#5AB8F5', e: '' }); S.lists.push({ id: 'lone', name: 'Only', c: '#5AB8F5', space: 'one' });
    applySettings(); render(); return { multi: multi.id, l: S.lists.find(x => x.space === multi.id).id }; });
  await page.locator(`#dHome [data-space="${r.multi}"]`).click();
  expect(await page.evaluate(() => S.space)).toBeNull();
  await expect(page.locator('#dHome .lp-card[data-lp="all"]')).toBeVisible();
  await page.locator(`#dHome .lp-card[data-lp="${r.l}"]`).click();
  expect(await page.evaluate(() => [S.space, S.list])).toEqual([r.multi, r.l]);
  await page.evaluate(() => goHome());
  await page.locator('#dHome [data-space="one"]').click();
  expect(await page.evaluate(() => S.space)).toBe('one');                           // one list: straight in
  noErrors(errors);
});
