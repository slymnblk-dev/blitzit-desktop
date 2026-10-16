// Windows app tray: settings switches talk to the desktop app (mocked here).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('tray: keep-in-tray and start-with-Windows switches reach the desktop app', async ({ page }) => {
  await page.addInitScript(() => {
    window.__calls = [];
    window.__TAURI__ = {
      core: { invoke: async (cmd, args) => { window.__calls.push([cmd, args]);
        if (cmd === 'check_update') return { current: '0.6.3', latest: null, notes: '' };
        if (cmd === 'autostart') return args && args.on != null ? args.on : false;
        if (cmd === 'take_link') return null;
        return null; } },
      event: { listen: async () => () => {}, emit: async () => {} },
    };
  });
  const errors = await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__calls.some(c => c[0] === 'set_tray' && c[1].keep === true))).toBe(true);
  await page.evaluate(() => { openSettings(); setView = 'data'; drawSettings(); });
  await expect(page.locator('text=Keep in tray when closed')).toBeVisible();
  await page.locator('[data-tg="trayKeep"]').click();
  await expect.poll(() => page.evaluate(() => window.__calls.some(c => c[0] === 'set_tray' && c[1].keep === false))).toBe(true);
  await page.locator('#autoStart').click();
  await expect.poll(() => page.evaluate(() => window.__calls.some(c => c[0] === 'autostart' && c[1].on === true))).toBe(true);
  await expect(page.locator('#autoStart')).toHaveAttribute('aria-pressed', 'true');
  noErrors(errors);
});
