// Desktop Home: Bento (default) or Calm column (Settings → Appearance → Layout on computers).
// Every bento card has an empty state with one button; cards show only when their mode is on.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const fill = () => {
  const now = Date.now(), sp = S.spaces[0].id;
  S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.goals = true; S.cfg.mx = true;
  S.habits = [{ id: 'h1', name: 'Meditate', e: '', space: null, days: [0, 1, 2, 3, 4, 5, 6], done: {}, created: now }];
  S.goals = [{ id: 'g1', name: 'Run a half marathon', e: '', space: null, why: '', due: gPlus(2), created: now, star: true, ms: [{ id: 'm1', t: '10 km', done: false }] }];
  S.kpis = [{ id: 1, space: sp, name: 'Outreach', target: 50, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: now, log: [{ id: 9, at: now, v: 8 }] }];
  S.okrs = [{ id: 3, space: sp, name: 'Win 3 customers', start: dkey(), end: mxQuarterEnd(), created: now, krs: [{ id: 4, name: 'Book 12 demos', from: 0, target: 12, unit: '', log: [] }] }];
  save(); goHome(); render();
};

test('bento: today list ticks off, cards for goal, habits, KPI and OKR, spaces open', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => C().homeLayout)).toBe('bento');
  // modes off: only Today and spaces
  await expect(page.locator('#dHome .bn-c')).toHaveCount(1);
  await page.evaluate(fill);
  await expect(page.locator('#dHome .bn-c')).toHaveCount(5);
  await expect(page.locator('#dHome .bn-goal')).toContainText('Run a half marathon');
  await expect(page.locator('#dHome .bn-kpi .bn-kv b')).toHaveText('8');
  await expect(page.locator('#dHome .bn-okr')).toContainText('Win 3 customers');
  // tick a task
  const n = await page.locator('#dHome .bn-tk').count();
  expect(n).toBeGreaterThan(0);
  const id = await page.locator('#dHome .bn-tk').first().getAttribute('data-hft');
  await page.locator(`#dHome [data-hfdone="${id}"]`).click();
  await expect.poll(() => page.evaluate(i => S.tasks.find(t => String(t.id) === i).stage, id)).toBe('done');
  // tick a habit
  await page.locator('#dHome .bn-hb').first().click();
  expect(await page.evaluate(() => !!S.habits[0].done[today()])).toBe(true);
  // a task row opens its details
  await page.locator('#dHome .bn-tk .bn-tt').first().click();
  await expect(page.locator('#detailSheet')).toHaveClass(/on/);
  await page.evaluate(() => closeSheets());
  await page.waitForTimeout(300);
  // the KPI card opens the popup on it
  await page.locator('#dHome .bn-kpi').click();
  await expect(page.locator('#mxPg')).toHaveClass(/on/);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  // spaces open
  await page.locator('#dHome .bn-sp[data-space]').first().click();
  expect(await page.evaluate(() => !!S.space)).toBe(true);
  noErrors(errors);
});

test('bento empty states, and the Calm column from settings', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.habits = true; S.cfg.wHabits = true; S.cfg.goals = true; S.cfg.mx = true; S.habits = []; S.goals = []; S.kpis = []; S.okrs = [];
    S.tasks.forEach(t => { if (t.stage === 'today') t.stage = 'week'; }); save(); goHome(); render(); });
  await expect(page.locator('#dHome .bn-c.is-empty')).toHaveCount(5);
  await expect(page.locator('#dHome .dh-empty b')).toHaveText(['Nothing planned yet', 'One big goal', 'Small daily wins', 'Track a number', 'Aim for the quarter']);
  // New KPI from its empty card opens the form
  await page.locator('#dHome [data-bnmx="kpi"]').click();
  await expect(page.locator('#mxIn')).toHaveAttribute('data-look', 'form');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  // Add a task opens the add sheet
  await page.locator('#dHome [data-bnadd]').click();
  await expect(page.locator('#addSheet')).toHaveClass(/on/);
  await page.evaluate(() => closeSheets());
  // Calm column
  await page.evaluate(() => { openSettings(); setView = 'appearance'; drawSettings(); });
  await page.locator('#setIn [data-k="homeLayout"][data-v="calm"]').click();
  await page.evaluate(() => closeSettings());
  await expect(page.locator('#dHome .cm')).toBeVisible();
  await expect(page.locator('#dHome .cm-up.is-empty')).toContainText('Nothing up next');
  await expect(page.locator('#dHome .cm-add')).toHaveCount(3);
  await page.evaluate(fill);
  await page.evaluate(() => { const t = S.tasks.find(x => x.stage === 'week'); t.stage = 'today'; save(); render(); });
  await expect(page.locator('#dHome .cm-up .cm-ut b')).not.toHaveText('');
  await expect(page.locator('#dHome .cm-r')).toHaveCount(3);
  noErrors(errors);
});
