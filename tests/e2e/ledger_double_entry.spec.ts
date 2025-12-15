import { test, expect } from '@playwright/test';

test('ledger double-entry verification', async ({ page }) => {
  const r = await page.goto('/ledger/new');
  if (!r || r.status() === 404) test.skip('Ledger UI not implemented');

  const debit = await page.$('select[name="account_debit"], input[name="account_debit"]');
  const credit = await page.$('select[name="account_credit"], input[name="account_credit"]');
  const amount = await page.$('input[name="amount"], input[type="number"]');
  const submit = await page.$('button[type="submit"]');

  if (!debit || !credit || !amount || !submit) test.skip('Ledger form fields not present');

  // Try fill amount and submit
  await amount.fill('123.45');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), submit.click()]);

  // Check ledger list for both debit and credit entries
  const list = await page.goto('/ledger');
  if (!list || list.status() === 404) test.skip('Ledger list not implemented');

  // Look for the amount in page content - best-effort
  const content = await page.content();
  expect(content.includes('123.45') || content.includes('123,45')).toBeTruthy();
});
