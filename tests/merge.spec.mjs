// First sign-in on a device that has its own tasks: no choice can wipe the account.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.mjs';

test('first sign-in: "Keep both" adds this device\'s tasks to the account and keeps the account\'s', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const L = S.lists[0];
    S.tasks = [...S.tasks, { id: 111, title: 'Only on this device', stage: 'today', list: L.id, est: 15, subs: [], notes: '', repeat: 'none', u: 5 }];
    const remote = { tasks: [{ id: 222, title: 'Only in my account', stage: 'week', list: 'lCloud', est: 30, subs: [], notes: '', repeat: 'none', u: 9 }],
      lists: [{ id: 'lCloud', name: 'Cloud list', c: '#9C95FF', space: S.spaces[0].id }], spaces: S.spaces, cfg: { ...S.cfg, name: 'Account name' }, cfgU: 1, tomb: {}, nid: 300 };
    // stand-in for the cloud: remember what would be uploaded
    window.__up = null; user = { id: 'u1' };
    sb = { from: () => ({ upsert: async row => { window.__up = row.data; return { error: null } },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data: remote }, error: null }) }) }) }) };
    mergeBoth(remote);
    return { titles: S.tasks.map(t => t.title), name: S.cfg.name };
  });
  expect(r.titles).toContain('Only on this device');
  expect(r.titles).toContain('Only in my account');
  expect(r.titles.some(t => ['Finish the mix for Friday','30 minute workout'].includes(t))).toBe(false);
  expect(r.name).toBe('Account name');
  await expect.poll(() => page.evaluate(() => window.__up && window.__up.tasks.map(t => t.title))).toEqual(expect.arrayContaining(['Only on this device', 'Only in my account']));
  noErrors(errors);
});
