// Focus sounds: 🎧 in focus mode, 5 sounds made in code, remembered, stops when focus ends, can be hidden.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

for (const look of ['classic', 'tide']) {
  test(`focus sounds in ${look === 'tide' ? 'Wave' : 'Digits'}: pick each sound, volume, stops on leave, comes back next time`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await openApp(page);
    await page.evaluate(look => { S.cfg.focusStyle = look; const t = S.tasks.find(x => x.stage === 'today'); look === 'tide' ? startTide([t]) : startBlitz([t]); }, look);
    await page.waitForTimeout(500);
    const btn = page.locator(look === 'tide' ? '#tide .amb-btn' : '#focus .amb-btn');
    await btn.click();
    await expect(page.locator('#ambPop')).toBeVisible();
    for (const id of ['rain', 'ocean', 'cafe', 'fire', 'brown']) {
      await page.locator(`#ambPop [data-ambp="${id}"]`).click();
      await page.waitForTimeout(450);
      expect(await page.evaluate(() => AMB.cur)).toBe(id);
    }
    await page.locator('#ambVol').fill('0.3');
    expect(await page.evaluate(() => S.cfg.ambVol)).toBe(0.3);
    await expect(btn).toHaveClass(/playing/);
    await page.evaluate(look => look === 'tide' ? tideLeave() : closeFocus(), look);
    expect(await page.evaluate(() => AMB.cur)).toBeNull();
    await page.evaluate(look => { const t = S.tasks.find(x => x.stage === 'today'); look === 'tide' ? startTide([t]) : startBlitz([t]); }, look);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => AMB.cur)).toBe('brown');                     // remembered
    noErrors(errors);
  });
}

test('focus sounds can be hidden in Settings', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await openApp(page);
  await page.evaluate(() => { openSettings(); setView = 'focus'; drawSettings(); });
  await page.locator('[data-tg="ambShow"]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => { closeSettings(); S.cfg.focusStyle = 'classic'; startBlitz([S.tasks.find(x => x.stage === 'today')]); });
  await page.waitForTimeout(400);
  await expect(page.locator('#focus .amb-btn')).toBeHidden();
  noErrors(errors);
});
