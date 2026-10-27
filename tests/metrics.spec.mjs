// Metrics: one page for every KPI and OKR. Computer: sidebar item when KPIs & OKRs is on.
// Phone: the flag tab holds Goals and Metrics with a switch; with Goals off, the tab is Metrics itself.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const seed = () => { const now = Date.now(), sp = S.spaces[0].id, sp2 = S.spaces[1].id;
  S.kpis = [{ id: 1, space: sp, name: 'Outreach', target: 50, unit: '', period: 'week', better: 'up', src: 'both', kind: 'sum', created: now, log: [{ id: 9, at: now, v: 8 }] },
    { id: 2, space: sp2, name: 'Deep work', target: 20, unit: 'hours', period: 'week', better: 'up', src: 'log', kind: 'sum', created: now, log: [] }];
  S.okrs = [{ id: 3, space: sp, name: 'Win 3 customers', start: dkey(), end: mxQuarterEnd(), created: now, krs: [{ id: 4, name: 'Book 12 demos', from: 0, target: 12, unit: '', log: [] }] }];
  save(); render(); };

test('computer: Metrics in the sidebar only with the mode on; KPIs and OKRs, filter, new KPI picks a space', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page);
  await expect(page.locator('#sMetrics')).toHaveCount(0);
  await page.evaluate(() => { setCfg('mx', true); });
  await page.evaluate(seed);
  await expect(page.locator('#sMetrics .n')).toHaveText('3');
  await page.locator('#sMetrics').click();
  await expect(page.locator('#metricsPg')).toHaveClass(/on/);
  await expect(page.locator('#sMetrics')).toHaveClass(/on/);
  await expect(page.locator('#sHome')).not.toHaveClass(/on/);
  await expect(page.locator('#metricsPg .mt-k')).toHaveCount(2);
  await expect(page.locator('#metricsPg .mt-o')).toHaveCount(1);
  // filter by space
  const sp2 = await page.evaluate(() => S.spaces[1].id);
  await page.locator(`#metricsPg [data-mtsp="${sp2}"]`).click();
  await expect(page.locator('#metricsPg .mt-k')).toHaveCount(1);
  await expect(page.locator('#metricsPg .mt-o')).toHaveCount(0);
  await expect(page.locator('#metricsPg .mt-empty')).toContainText('Aim for the quarter');
  await page.locator('#metricsPg [data-mtsp="all"]').click();
  // a KPI opens in the popup; Escape comes back to Metrics
  await page.locator('#metricsPg .mt-kb').first().click();
  await expect(page.locator('#mxPg')).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mxPg')).not.toHaveClass(/on/);
  await expect(page.locator('#metricsPg')).toHaveClass(/on/);
  // New KPI from All spaces asks for the space
  await page.locator('#metricsPg [data-mtnewmenu]').click();
  await page.locator('.cx-pop button', { hasText: 'New KPI' }).click();
  await expect(page.locator('#mxPg [data-mtpick]')).toHaveCount(3); // two spaces, or no space
  await page.locator(`#mxPg [data-mtpick="${sp2}"]`).click();
  await page.fill('#mxPg [data-mxf="name"]', 'Calls');
  await page.fill('#mxPg [data-mxf="target"]', '10');
  await page.locator('#mxPg [data-mxsave]').click();
  await expect(page.locator('#mxPg')).not.toHaveClass(/on/);
  expect(await page.evaluate(sp => { const k = S.kpis.find(x => x.name === 'Calls'); return k && String(k.space) === String(sp); }, sp2)).toBe(true);
  await expect(page.locator('#metricsPg .mt-k')).toHaveCount(3);
  // By space: one card per space; computer sidebar groups Habits, Goals and Metrics under Modes
  await page.locator('#metricsPg [data-mtview="space"]').click();
  await expect(page.locator('#metricsPg .mt2-sp')).toHaveCount(await page.evaluate(() => S.spaces.length));
  await page.locator('#metricsPg [data-mtview="list"]').click();
  await expect(page.locator('#sLists .s-lbl2').first()).toHaveText('Modes');
  // Home closes it; turning the mode off removes it
  await page.locator('#sHome').click();
  await expect(page.locator('#metricsPg')).not.toHaveClass(/on/);
  await page.evaluate(() => setCfg('mx', false));
  await expect(page.locator('#sMetrics')).toHaveCount(0);
  noErrors(errors);
});

test('phone: Goals | Metrics switch on the flag tab; Metrics is its own tab when Goals is off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.cfg.goals = true; S.cfg.mx = true; applySettings(); goHome(); });
  await page.evaluate(seed);
  const ids = await page.locator('#tbIn > button').evaluateAll(b => b.map(x => x.id));
  expect(ids).toContain('tbGoals'); expect(ids).not.toContain('tbMetrics');
  await page.locator('#tbGoals').click();
  await expect(page.locator('#goalsPg .mt-sw')).toBeVisible();
  await page.locator('#goalsPg [data-mtsw="metrics"]').click();
  await expect(page.locator('#metricsPg')).toHaveClass(/on/);
  await expect(page.locator('#tbGoals')).toHaveAttribute('aria-current', 'page');
  await page.locator('#metricsPg [data-mtsw="goals"]').click();
  await expect(page.locator('#goalsPg')).toHaveClass(/on/);
  await expect(page.locator('#metricsPg')).not.toHaveClass(/on/);
  await page.locator('#tbHome').click();
  await page.evaluate(() => { setCfg('goals', false); });
  await expect(page.locator('#tbMetrics')).toBeVisible();
  await page.locator('#tbMetrics').click();
  await expect(page.locator('#metricsPg')).toHaveClass(/on/);
  await expect(page.locator('#metricsPg .mt-sw')).toHaveCount(0);
  noErrors(errors);
});
