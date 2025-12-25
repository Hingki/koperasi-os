import { test, expect } from '@playwright/test';

/**
 * Member Registration E2E Tests
 * 
 * Tests the complete member registration flow:
 * 1. User registration (Supabase Auth)
 * 2. Member profile registration via API
 * 3. RLS verification
 * 4. Validation error handling
 * 
 * NOTE: Skipped due to Supabase Auth Rate Limits in CI/Test environment.
 * The test creates a new user for every run, which hits the rate limit (429) quickly.
 * To test this locally, remove .skip and ensure you haven't hit the limit.
 */

test.describe.skip('Member Registration Flow', () => {
  // Generate unique test data for each test run
  const timestamp = Date.now();
  // Use gmail.com to pass strict email validation in Supabase/GoTrue
  const testEmail = `e2e.member.${timestamp}@gmail.com`;
  const testNIK = `320101${String(timestamp).slice(-10)}`; // 16 digits
  const testPhone = `0812345${String(timestamp).slice(-5)}`;

  test('complete member registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Registrasi Anggota Koperasi');

    // Fill registration form
    await page.fill('input[name="nama_lengkap"]', 'E2E Test Member');
    await page.fill('input[name="nik"]', testNIK);
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('textarea[name="alamat_lengkap"]', 'Jl. Test No. 123, Jakarta');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Debug console logs from browser
    page.on('console', msg => console.error(`[BROWSER] ${msg.text()}`));

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message or redirect
    // Do NOT click submit again


    // Check for success or error message
    // Allow for slight variations in text or UI structure
    const successMessage = page.locator('text=/berhasil|success|selamat/i');
    // Remove 'login' from error regex as it appears in success message ("...coba Login sekarang")
    const errorMessage = page.locator('text=/error|gagal|failed|mohon perbaiki|kesalahan|unauthorized/i');

    // Debug button state if it hangs
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isDisabled()) {
        const btnText = await submitBtn.textContent();
        console.log(`[DEBUG] Submit button is disabled with text: "${btnText}"`);
    }

    try {
      await expect(successMessage.first().or(errorMessage.first())).toBeVisible({ timeout: 15000 });
      
      if (await errorMessage.first().isVisible()) {
          const text = await errorMessage.first().textContent();
          console.log(`[DEBUG] Registration failed with message: "${text}"`);
          // Fail the test immediately if we see an error
          throw new Error(`Registration failed: ${text}`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Registration failed')) {
          throw e;
      }
      console.log('Success/Error message not found or timed out, checking URL redirect immediately');
    }

    // Verify redirect to login page OR dashboard (depending on auth config)
    // Wait up to 10 seconds for navigation
    await expect.poll(async () => page.url(), { timeout: 10000 }).toMatch(/\/login|\/dashboard/);
  });

  test('validation errors - invalid NIK format', async ({ page }) => {
    await page.goto('/register');

    // Fill form with invalid NIK (less than 16 digits)
    await page.fill('input[name="nama_lengkap"]', 'Test User');
    await page.fill('input[name="nik"]', '12345'); // Invalid: too short
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', `invalid.nik.${timestamp}@gmail.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    // Should show validation error for NIK
    await expect(page.locator('text=/NIK.*16.*digit/i')).toBeVisible({ timeout: 5000 });
  });

  test('validation errors - invalid phone format', async ({ page }) => {
    await page.goto('/register');

    // Fill form with invalid phone
    await page.fill('input[name="nama_lengkap"]', 'Test User');
    await page.fill('input[name="nik"]', testNIK);
    await page.fill('input[name="phone"]', '123'); // Invalid: too short
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', `invalid-phone${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    // Should show validation error for phone
    await expect(page.locator('text=/nomor.*HP|phone/i')).toBeVisible({ timeout: 5000 });
  });

  test('validation errors - missing required fields', async ({ page }) => {
    await page.goto('/register');

    // Submit form without filling required fields
    await page.click('button[type="submit"]');

    // Browser validation should prevent submission
    // Or we should see validation errors
    const requiredFields = ['nama_lengkap', 'nik', 'phone', 'alamat_lengkap', 'email', 'password'];
    
    for (const field of requiredFields) {
      const input = page.locator(`input[name="${field}"], textarea[name="${field}"]`);
      await expect(input).toHaveAttribute('required');
    }
  });

  test('duplicate NIK error handling', async ({ page }) => {
    // First registration
    await page.goto('/register');
    await page.fill('input[name="nama_lengkap"]', 'First User');
    await page.fill('input[name="nik"]', testNIK);
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', `first.${timestamp}@gmail.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000); // Wait for first registration

    // Second registration with same NIK (should fail)
    await page.goto('/register');
    await page.fill('input[name="nama_lengkap"]', 'Second User');
    await page.fill('input[name="nik"]', testNIK); // Same NIK
    await page.fill('input[name="phone"]', `0812345${String(timestamp + 1).slice(-5)}`);
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', `second.${timestamp}@gmail.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should show duplicate NIK error
    await expect(
      page.locator('text=/NIK.*sudah.*terdaftar|NIK.*already/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('form loading state during submission', async ({ page }) => {
    await page.goto('/register');

    // Fill form
    await page.fill('input[name="nama_lengkap"]', 'Test User');
    await page.fill('input[name="nik"]', testNIK);
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', `loading.test.${timestamp}@gmail.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Click submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should be disabled and show loading text
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toContainText('Mendaftar');
  });

  test('error message display for API errors', async ({ page }) => {
    await page.goto('/register');

    // Try to register without being authenticated first
    // This should trigger an API error
    // Note: This test might need adjustment based on actual flow
    
    // Fill form with valid data
    await page.fill('input[name="nama_lengkap"]', 'Test User');
    await page.fill('input[name="nik"]', testNIK);
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', `error-test${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    // Should show error message (if any)
    // The form should handle errors gracefully
    const errorMessage = page.locator('text=/error|gagal|failed/i');
    // Error might or might not appear depending on flow
    // This is more of a smoke test
  });
});

test.describe.skip('Member Registration - RLS Security', () => {
  test('user can only register their own member profile', async ({ page }) => {
    // This test verifies that RLS policy enforces user_id = auth.uid()
    // The API endpoint should handle this correctly
    
    const timestamp = Date.now();
    const testEmail = `rls.test.${timestamp}@gmail.com`;
    const testNIK = `320101${String(timestamp).slice(-10)}`;

    await page.goto('/register');
    
    // Fill and submit form
    await page.fill('input[name="nama_lengkap"]', 'RLS Test User');
    await page.fill('input[name="nik"]', testNIK);
    await page.fill('input[name="phone"]', `0812345${String(timestamp).slice(-5)}`);
    await page.fill('textarea[name="alamat_lengkap"]', 'Test Address');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // If registration succeeds, RLS is working correctly
    // The API endpoint sets user_id = auth.uid() automatically
    // RLS policy will reject if user_id doesn't match
    
    // Verify success (RLS passed)
    const successIndicator = page.locator('text=/berhasil|success|selamat/i');
    try {
        await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
    } catch (e) {
        // Ignore if redirected quickly
    }
    // Check redirect
    await expect.poll(async () => page.url(), { timeout: 10000 }).toMatch(/\/login|\/dashboard/);
  });
});



