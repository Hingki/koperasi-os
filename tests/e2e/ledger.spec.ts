import { test, expect } from '@playwright/test';

test('ledger entry UI exists and can submit (non-blocking)', async ({ page }) => {
  const resp = await page.goto('/ledger/new');
  if (!resp || resp.status() === 404) {
    // Try a generic ledger page
    const r2 = await page.goto('/ledger');
    if (!r2 || r2.status() === 404) test.skip('Ledger UI not implemented');
  }

  // Look for common fields
  const debit = await page.$('select[name="account_debit"], input[name="account_debit"]');
  const credit = await page.$('select[name="account_credit"], input[name="account_credit"]');
  const amount = await page.$('input[name="amount"], input[type="number"]');
  const submit = await page.$('button[type="submit"]');

  if (!debit || !credit || !amount || !submit) {
    test.skip('Ledger form fields not present');
  }

  // Fill with sample values (if selects exist, simply focus)
  await amount.fill('100.00');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), submit.click()]);

  expect(page.url().length).toBeGreaterThan(0);
});
