// Plan (optional mode): today's tasks as time blocks. Auto-plan fits them around busy time, biggest impact first.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const freeDay = () => { S.cfg.planFrom = 0; S.cfg.planTo = 1440; };

test('phone: off by default; auto-plan, busy time, move and take off, clear with undo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await expect(page.locator('#tabBar [data-tab="plan"]')).toHaveCount(0);
  await page.evaluate(() => { S.cfg.plan = true; S.cfg.planFrom = 0; S.cfg.planTo = 1440; S.cfg.tabs = ['plan']; save(); applySettings(); goHome(); });
  await page.locator('#tabBar [data-tab="plan"]').click();
  await expect(page.locator('#planPg')).toHaveClass(/on/);
  const n = await page.evaluate(() => pnToPlace().length);
  expect(n).toBeGreaterThan(1);
  await expect(page.locator('#planPg .pn-tray .pn-chip')).toHaveCount(n);
  // a big-impact task goes first
  const big = await page.evaluate(n => { const t = pnToPlace()[n - 1]; t.imp = 5; save(); drawPlan(); return t.id; }, n);
  await page.locator('#planPg [data-pnauto]').click();
  await expect(page.locator('#planPg .pn-blk.task')).toHaveCount(n);
  await expect(page.locator('#planPg .pn-tray')).toHaveCount(0);
  const order = await page.evaluate(() => pnOnPlan().map(t => t.id));
  expect(order[0]).toBe(big);
  // no overlaps, all after now
  const ok = await page.evaluate(() => { const p = pnOnPlan(); return p.every((t, i) => i === 0 || p[i - 1].pl.s + pnLen(p[i - 1]) <= t.pl.s) && p[0].pl.s >= pnNowMin() - 15; });
  expect(ok).toBe(true);
  // busy time
  await page.locator('#planPg [data-pnbnew]').click();
  await expect(page.locator('#pnBName')).toBeFocused();
  await page.keyboard.type('Lunch');
  await page.locator('#pnBRep').check();
  await page.locator('#planPg [data-pnbsave]').click();
  await expect(page.locator('#planPg .pn-blk.busy')).toContainText('Lunch');
  expect(await page.evaluate(() => [S.blocks.length, S.blocks[0].rep, localDoc().blocks.length, JSON.parse(backupData()).blocks.length])).toEqual([1, true, 1, 1]);
  // a block's menu: later 15 min, then take it off the plan
  const s0 = await page.evaluate(id => S.tasks.find(t => t.id === id).pl.s, big);
  await page.locator(`#planPg .pn-blk[data-pnt="${big}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Later 15 min' }).click();
  expect(await page.evaluate(id => S.tasks.find(t => t.id === id).pl.s, big)).toBe(s0 + 15);
  await page.locator(`#planPg .pn-blk[data-pnt="${big}"]`).click();
  await page.locator('#cxPop button', { hasText: 'Take off the plan' }).click();
  await expect(page.locator('#planPg .pn-tray .pn-chip')).toHaveCount(1);
  // tap the chip: next free spot
  await page.locator('#planPg .pn-tray .pn-chip').click();
  await expect(page.locator('#planPg .pn-tray')).toHaveCount(0);
  // clear, then undo
  await page.locator('#planPg [data-pnclear]').click();
  await expect(page.locator('#planPg .pn-blk.task')).toHaveCount(0);
  await page.locator('#undoBtn').click();
  await expect(page.locator('#planPg .pn-blk.task')).toHaveCount(n);
  // turning the mode off removes the tab
  await page.evaluate(() => setCfg('plan', false));
  await expect(page.locator('#tabBar [data-tab="plan"]')).toBeHidden();
  noErrors(errors);
});

test('computer: sidebar opens Plan; drag a task onto the day; tap an empty hour to place one; Settings card', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.plan = true; S.cfg.planFrom = 0; S.cfg.planTo = 1440; save(); applySettings(); goHome(); });
  const n = await page.evaluate(() => pnToPlace().length);
  await expect(page.locator('#sPlan .n')).toHaveText(String(n));
  await page.locator('#sPlan').click();
  await expect(page.locator('#planPg')).toHaveClass(/on/);
  await expect(page.locator('#planPg .pn-l .pn-chip[data-pnplace]')).toHaveCount(n);
  // drag the first onto the timeline
  const first = page.locator('#planPg .pn-l .pn-chip[data-pnplace]').first();
  const id = await first.getAttribute('data-pnplace');
  const box = await page.locator('#pnTl').boundingBox();
  await first.hover(); await page.mouse.down();
  const y = Math.max(box.y, 0) + 300; // the page scrolls to now on open
  await page.mouse.move(box.x + 200, y - 20, { steps: 8 }); await page.mouse.move(box.x + 210, y, { steps: 4 }); await page.mouse.up();
  await expect(page.locator(`#planPg .pn-blk[data-pnt="${id}"]`)).toHaveCount(1);
  expect(await page.evaluate(id => S.tasks.find(t => String(t.id) === id).pl.s % 15, id)).toBe(0);
  // tap an empty spot: the menu offers the tasks still to place
  await page.locator('#pnTl').click({ position: { x: 300, y: 40 } });
  await expect(page.locator('#cxPop button').first()).toBeVisible();
  await page.locator('#cxPop button').first().click();
  await expect(page.locator('#planPg .pn-blk.task')).toHaveCount(2);
  // Escape closes the page
  await page.keyboard.press('Escape');
  await expect(page.locator('#planPg')).not.toHaveClass(/on/);
  // Settings → Modes: Plan card with the hours of the day
  await page.evaluate(() => { S.cfg.planFrom = 480; S.cfg.planTo = 1200; openSettings(); setView = 'modes'; drawSettings(); });
  await expect(page.locator('#setIn .md-card[data-md="plan"]')).toContainText('Time blocks for today');
  await page.locator('#setIn [data-pnh="planFrom"]').selectOption('420');
  expect(await page.evaluate(() => S.cfg.planFrom)).toBe(420);
  noErrors(errors);
});
