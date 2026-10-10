// Windows app features, checked with a fake desktop app: mini timer, sign-in links, update window.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, fakeDesktop } from './helpers.mjs';

const calls = (page, name) => page.evaluate(n => __inv.filter(c => c[0] === n), name);
const lastState = page => page.evaluate(() => __em[__em.length - 1]);

test('mini timer: opens, follows the session, finish screen stays in the mini timer', async ({ page }) => {
  const errors = await openApp(page, { desk: fakeDesktop() });
  await page.evaluate(() => { S.cfg.focusStyle = 'classic'; S.cfg.focusMode = 'free'; save(); $('goBtn').click(); });
  await page.evaluate(() => deskOpen());
  await expect.poll(async () => (await calls(page, 'open_mini')).length).toBe(1);
  await expect.poll(async () => (await lastState(page))?.title).toBeTruthy();
  const total = await page.evaluate(() => F.q.length);
  for (let i = 0; i < total; i++) { await page.evaluate(() => { F.tapAt = 0; __act({ payload: 'done' }); }); await page.waitForTimeout(200); }
  await expect.poll(async () => (await lastState(page))?.sum).toBe(true);
  expect(await calls(page, 'close_mini')).toEqual([]); // the big window is not pulled up
  await page.evaluate(() => __act({ payload: 'dismiss' }));
  await expect.poll(() => calls(page, 'close_mini')).toEqual([['close_mini', { restore: false }]]);
  noErrors(errors);
});

test('mini timer page shows each state', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(`window.__h=[];window.__TAURI__={event:{emit:async()=>{},listen:async(n,f)=>{__h.push(f);return()=>{}}},core:{invoke:async()=>{}}};`);
  await page.setViewportSize({ width: 336, height: 178 });
  await page.goto('/mini.html');
  const send = st => page.evaluate(s => __h.forEach(f => f({ payload: s })), st);
  const V = { fbg: '#FF5B47', fink: '#0F1013', dark: false, fade: true };
  await send({ title: 'Write the plan', time: '12:00', bar: 40, run: true, mode: 'compact', vars: V });
  await expect(page.locator('#pvT')).toHaveText('Write the plan');
  await send({ title: 'Write the plan', time: '30:00', bar: 100, run: true, up: true, mode: 'compact', vars: V });
  await expect(page.locator('#pv')).toHaveClass(/up/);
  await send({ sum: true, n: 3, time: '1h', mode: 'compact', vars: V });
  await expect(page.locator('.pv-sum b')).toHaveText('Day won');
  noErrors(errors);
});

test('sign-in: the browser hands the email link to the desktop app', async ({ page }) => {
  const errors = await openApp(page, { url: '/index.html?desk=1#access_token=AAA&refresh_token=BBB&type=magiclink', skipIntro: false });
  await expect(page.locator('.handoff h1')).toContainText('Opening Windaday');
  noErrors(errors);
});

test('sign-in: the desktop app picks up a link and signs in', async ({ page }) => {
  const errors = await openApp(page, { desk: fakeDesktop({ link: 'blitzit://auth#access_token=AT1&refresh_token=RT1' }) });
  await expect.poll(() => page.evaluate(() => __sb.sets)).toEqual([{ access_token: 'AT1', refresh_token: 'RT1' }]);
  noErrors(errors);
});

test('update window: shows what is new, and waits until a session is over', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 800 });
  const errors = await openApp(page, { desk: fakeDesktop({ latest: '9.9.9', notes: '- First thing\n- Second thing\n' }) });
  await page.evaluate(() => $('goBtn').click()); // a session is running
  await page.waitForTimeout(4600);
  await expect(page.locator('#upd')).toHaveCount(0);
  await page.evaluate(() => closeFocus());
  await expect(page.locator('#upd')).toBeVisible();
  await expect(page.locator('#upd li')).toHaveCount(2);
  await page.keyboard.press('Enter');
  await expect(page.locator('#upd')).toHaveClass(/busy/);
  noErrors(errors);
});
