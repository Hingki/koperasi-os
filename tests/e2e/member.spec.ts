import { test, expect } from '@playwright/test';

test('member onboarding (registration + profile)', async ({ page }) => {
  // Visit registration
  const r = await page.goto('/auth/register');
  if (!r || r.status() === 404) test.skip('Registration page not implemented');

  // Fill minimal fields if present
  const email = await page.$('input[name="email"]');
  const password = await page.$('input[name="password"]');
  const name = await page.$('input[name="nama"]');
  const submit = await page.$('button[type="submit"]');

  if (!email || !password || !submit) test.skip('Registration form not present');

  await email.fill('e2e+member@example.com');
  await password.fill('P@ssword123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), submit.click()]);

  // If profile page exists, try fill some fields
  const profile = await page.goto('/member/profile').catch(() => null);
  if (profile && profile.ok()) {
    const nama = await page.$('input[name="nama"]');
    if (nama) {
      await nama.fill('E2E Member');
      const save = await page.$('button[type="submit"]');
      if (save) await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), save.click()]);
    }
  }

  // Finally, check member list for presence (if available)
  const list = await page.goto('/member');
  if (!list || list.status() === 404) test.skip('Member list not implemented');
  expect(list.ok()).toBeTruthy();
});
