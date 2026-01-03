import { test, expect } from '@playwright/test';

test('Manual Member Registration Flow', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@koperasi.id');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:3000/dashboard/members/new');
  await page.fill('input[name="nama_lengkap"]', 'Test Member Playwright');
  await page.fill('input[name="nik"]', '1234567890123456');
  await page.fill('input[name="phone"]', '081234567890');
  await page.fill('textarea[name="alamat_lengkap"]', 'Jl. Testing Otomatis No. 1');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard\/members/, { timeout: 10000 });
});
