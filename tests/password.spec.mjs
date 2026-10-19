// Sign in with a password, create an account, reset a forgotten password.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('password: wrong password is explained, sign-up asks to confirm the email, reset sends a link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page);
  await page.evaluate(() => openYou('account'));
  await expect(page.locator('#accPw')).toBeVisible();
  await page.locator('#accEmail').fill('me@example.com');
  await page.locator('#accPw').fill('nope');
  await page.locator('#accPw').press('Enter');
  await expect(page.locator('.acc-msg')).toHaveText('Wrong email or password.');
  // show / hide
  await page.locator('#accPw').fill('abc');
  await page.locator('#pwEye').click();
  await expect(page.locator('#accPw')).toHaveAttribute('type', 'text');
  // create an account
  await page.locator('#accToSignup').click();
  await expect(page.locator('#accEmail')).toHaveValue('me@example.com');
  await page.locator('#accPw').fill('short');
  await expect(page.locator('#pwHint')).not.toHaveClass(/ok/);
  await page.locator('#accSignup').click();
  await expect(page.locator('.acc-msg')).toHaveText('Use at least 8 characters.');
  await page.locator('#accPw').fill('long-enough-pw');
  await expect(page.locator('#pwHint')).toHaveClass(/ok/);
  await page.locator('#accSignup').click();
  await expect(page.locator('.mail-wait h2')).toHaveText('Confirm your email');
  // forgot password
  await page.locator('#accToSignin').click();
  await page.locator('#accToForgot').click();
  await page.locator('#accReset').click();
  await expect(page.locator('.mail-wait h2')).toHaveText('Check your email');
  const calls = await page.evaluate(() => __sb.pw.map(c => c[0]));
  expect(calls).toEqual(['in', 'up', 'reset']);
  noErrors(errors);
});

test('password: the reset link opens "Set a new password" and saves it', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { user = { id: 'u1', email: 'me@example.com' }; openNewPassword(); });
  await expect(page.locator('.auth-h h2')).toHaveText('Set a new password');
  await page.locator('#accNewPw').fill('a-brand-new-password');
  await page.locator('#accSavePw').click();
  await expect.poll(() => page.evaluate(() => __sb.pw.some(c => c[0] === 'update' && c[1].password === 'a-brand-new-password'))).toBe(true);
  await expect(page.locator('#accPwOpen')).toBeVisible();                 // back to the signed-in account page
  noErrors(errors);
});
