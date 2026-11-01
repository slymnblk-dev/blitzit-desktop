// First time: land on the example tasks, a quiet "Example tasks · Clear" chip on Home, "Start fresh" to pick spaces,
// and a 1-minute do-it-yourself tour (the card follows what you do). Same on phones and computers.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const fresh = async (page, size) => {
  await page.setViewportSize(size);
  await page.addInitScript(() => { window.__tourTest = true; });
  const errors = await openApp(page, { skipIntro: false });
  await expect(page.locator('#tourCard')).toHaveClass(/on/);
  return errors;
};

for (const [name, size, desk] of [['phone', { width: 390, height: 844 }, false], ['computer', { width: 1400, height: 860 }, true]]) {
  test(`${name}: hello, then the tour follows you: open a space, lists, stages, plan the week, pick today, details`, async ({ page }) => {
    const errors = await fresh(page, size);
    await expect(page.locator('#tourCard')).toContainText('Here are some example tasks');
    await page.locator('[data-tstart]').click();
    await expect(page.locator('#tourCard')).toContainText('1 of 6');
    await expect(page.locator('#tourRing')).toHaveClass(/on/);
    // step 1: you open the space yourself
    const sp = await page.evaluate(() => firstSp().id);
    await page.locator(`[data-space="${sp}"]`).locator('visible=true').first().click();
    await expect(page.locator('#tourCard')).toContainText('2 of 6');
    await page.locator('[data-tgo]').click();
    await expect(page.locator('#tourCard')).toContainText('Four stages');
    await page.locator('[data-tgo]').click();
    await expect(page.locator('#tourCard')).toContainText('Plan your week');
    // moving a task Backlog → My week (swipe or drag) moves the tour on; so does My week → Today
    await page.evaluate(() => { const t = S.tasks.find(x => x.stage === 'backlog' && listOf(x.list).space === S.space); commit(() => setStage(t, 'week'), 'Moved'); });
    await expect(page.locator('#tourCard')).toContainText('Pick today');
    await page.evaluate(() => { const t = S.tasks.find(x => x.stage === 'week' && listOf(x.list).space === S.space); commit(() => setStage(t, 'today'), 'Moved'); });
    await expect(page.locator('#tourCard')).toContainText('details');
    const row = desk ? '.col[data-s="today"] li.row' : '#list li.row';
    if (!desk) await page.evaluate(() => { S.stage = 'today'; render(); });
    await page.locator(row).first().locator('.row-in').click({ position: { x: 120, y: 14 } });
    await expect(page.locator('#tourCard')).toContainText('You’re all set');
    await page.locator('[data-tdone]').click();
    await expect(page.locator('#tourCard')).not.toHaveClass(/on/);
    noErrors(errors);
  });

  test(`${name}: "Example tasks · Clear" on Home → Start fresh keeps your own work, undo brings the examples back`, async ({ page }) => {
    const errors = await fresh(page, size);
    await page.locator('#tourCard [data-tx]').first().click();
    await expect(page.locator('#tourCard')).not.toHaveClass(/on/);
    const chip = page.locator('.demo-chip').locator('visible=true');
    await expect(chip).toHaveCount(1);
    // something of your own stays
    await page.evaluate(() => { const l = S.lists.find(x => x.space === S.spaces[1].id); S.tasks.push({ id: newId(), title: 'My own task', stage: 'today', list: l.id, est: 30, subs: [], notes: '', repeat: 'none' }); save(); render(); });
    await chip.click();
    await expect(page.locator('#sfDlg')).toHaveClass(/on/);
    await page.locator('[data-sfp="Personal"]').click(); // unpick Personal (it still has my task, so it stays)
    await page.locator('[data-sfp="Health"]').click();
    await page.locator('[data-sfgo]').click();
    await expect(page.locator('#sfDlg')).not.toHaveClass(/on/);
    let r = await page.evaluate(() => ({ sp: S.spaces.map(s => s.name), titles: S.tasks.map(t => t.title), demo: S.demoOn, lists: S.lists.length }));
    expect(r.titles).toEqual(['My own task']);
    expect(r.sp).toEqual(['Work', 'Personal', 'Health']);
    expect(r.demo).toBe(false);
    await expect(page.locator('.demo-chip')).toHaveCount(0);
    await page.locator('#undoBtn').click();
    expect(await page.evaluate(() => S.tasks.length)).toBe(19);
    noErrors(errors);
  });
}

test('Settings → Help → Take the quick tour starts at step 1; automated checks never see the tour on their own', async ({ page }) => {
  const errors = await openApp(page, { skipIntro: false });
  await page.waitForTimeout(800);
  await expect(page.locator('#tourCard')).toHaveCount(0);
  await page.evaluate(() => openSettings());
  await page.locator('#replayIntro').click();
  await expect(page.locator('#tourCard')).toHaveClass(/on/);
  await expect(page.locator('#tourCard')).toContainText('1 of 6');
  await page.keyboard.press('Escape');
  await expect(page.locator('#tourCard')).not.toHaveClass(/on/);
  noErrors(errors);
});
