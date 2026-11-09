// Polish pass (0.316): the full review. ① ③ ④ ⑤ ⑥ ⑦ apply to both designs; ② and the bigger hero task are Flow only.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

const phone = page => page.setViewportSize({ width: 390, height: 844 });
const desk = page => page.setViewportSize({ width: 1400, height: 900 });
const setUi = (page, ui, extra = {}) => page.evaluate(([ui, x]) => { S.cfg.ui = ui; Object.assign(S.cfg, x); save(); applySettings(); goHome(); render(); }, [ui, extra]);
const todayTask = page => page.evaluate(() => { const t = S.tasks.find(x => shown(x) && x.stage !== 'done'); t.stage = 'today'; save(); render(); return t.id; });

test('① Home on phones: no theme switch on top, tab names under icons; Flow hero shows the task biggest', async ({ page }) => {
  await phone(page);
  const errors = await openApp(page);
  await todayTask(page);
  for (const ui of ['classic', 'flow']) {
    await setUi(page, ui, { habits: true });
    await expect(page.locator('#ttPhone')).toBeHidden();
    await expect(page.locator('.tb .tb-l').first()).toBeVisible();
  }
  const sz = await page.evaluate(() => [getComputedStyle(document.querySelector('#homeView .td-title')).fontSize, getComputedStyle(document.querySelector('#homeView .td-head')).display]);
  expect(sz).toEqual(['24px', 'none']);
  await setUi(page, 'classic');
  await expect(page.locator('#homeView .td-head')).toBeVisible();                    // Classic keeps its "Today" card as it was
  await desk(page);                                                                  // computers keep the theme switch
  await expect(page.locator('.tt-btn:visible').first()).toBeVisible();
  noErrors(errors);
});
