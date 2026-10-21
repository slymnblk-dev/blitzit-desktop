// Weekly review: card on Home when due, review screen moves leftovers, finishing hides the card until next week.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('weekly review: due card, back to backlog, finish', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => { S.firstUse = 0; S.cfg.reviewedAt = 0; S.tasks[0].title = 'Not demo'; render(); });
  await expect(page.locator('.app [data-rvgo]')).toBeVisible();
  await page.locator('.app [data-rvgo]').click();
  await expect(page.locator('#reviewPg')).toHaveClass(/on/);
  const id = await page.locator('#reviewPg [data-rvb]').first().getAttribute('data-rvb');
  await page.locator(`#reviewPg [data-rvb="${id}"]`).click();
  await expect.poll(() => page.evaluate(i => S.tasks.find(t => t.id === +i).stage, id)).toBe('backlog');
  await page.click('#rvDone');
  await expect(page.locator('#reviewPg')).not.toHaveClass(/on/);
  await expect(page.locator('[data-rvgo]')).toHaveCount(0);
  noErrors(errors);
});
