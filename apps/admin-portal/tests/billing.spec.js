// @ts-check
const { test, expect } = require('@playwright/test');

const ADMIN_HTML_URL = 'http://localhost:3000/admin.html';

async function openApp(page) {
  await page.goto(ADMIN_HTML_URL);
  await expect(page.locator('#app-shell')).toBeVisible();
}

// Not gated by data-superadmin-only — backend access control for a regular admin is
// already covered in tests/admin.test.js ("a regular admin can view and update
// billing"); this file verifies the UI itself actually saves and reloads correctly.
test.describe('billing', () => {
  test('nav item is visible, and editing a row actually persists', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.nav-item[data-page="billing"]')).toBeVisible();

    const firstLoad = page.waitForResponse((r) => r.url().endsWith('/admin/billing') && r.request().method() === 'GET');
    await page.click('.nav-item[data-page="billing"]');
    await firstLoad; // wait for loadBilling()'s fetch to actually resolve before reading the table

    const row = page.locator('#billing-table-body tr').first();
    const hasCase = (await row.locator('td').count()) > 1; // the empty-state row is a single <td colspan>
    test.skip(!hasCase, 'No cases exist in the dev DB to bill against.');

    await row.locator('input[id^="bill-amount-"]').fill('999.50');
    await row.locator('select[id^="bill-currency-"]').selectOption('AED');
    await row.locator('select[id^="bill-status-"]').selectOption('invoiced');
    await row.locator('input[id^="bill-notes-"]').fill('Playwright test note');

    const saveResponse = page.waitForResponse((r) => /\/admin\/cases\/\d+\/billing$/.test(r.url()) && r.request().method() === 'PATCH');
    await row.locator('button', { hasText: 'Save' }).click();
    expect((await saveResponse).ok()).toBe(true);

    // Reload the page fresh and confirm the save actually persisted server-side.
    await page.click('.nav-item[data-page="dashboard"]');
    const reload = page.waitForResponse((r) => r.url().endsWith('/admin/billing') && r.request().method() === 'GET');
    await page.click('.nav-item[data-page="billing"]');
    await reload;
    const reloadedRow = page.locator('#billing-table-body tr').first();
    await expect(reloadedRow.locator('input[id^="bill-amount-"]')).toHaveValue('999.5');
    await expect(reloadedRow.locator('input[id^="bill-notes-"]')).toHaveValue('Playwright test note');
  });
});

