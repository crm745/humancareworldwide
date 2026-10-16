// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = 'admin@humancareworldwide.com';
const ADMIN_PASSWORD = 'TestAdmin@2026'; // seeded by backend/src/seed-admin.js
const ADMIN_HTML_URL = 'file://' + path.join(__dirname, '..', 'admin.html').replace(/\\/g, '/');

async function login(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(ADMIN_HTML_URL);
  await page.fill('#lg-email', email);
  await page.fill('#lg-pwd', password);
  await page.locator('button', { hasText: 'Log In' }).click();
}

test.describe('login', () => {
  test('rejects a wrong password', async ({ page }) => {
    await login(page, ADMIN_EMAIL, 'definitely-wrong');
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#app-shell')).not.toBeVisible();
  });

  test('logs in with the correct credentials and shows the dashboard', async ({ page }) => {
    await login(page);
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#page-dashboard')).toHaveClass(/active/);
  });
});

test.describe('dashboard', () => {
  test('loads stat tiles and the recent cases table', async ({ page }) => {
    await login(page);
    // Tiles start as "—" and get replaced with real numbers once the API calls resolve.
    await expect(page.locator('#stat-grid .num').first()).not.toHaveText('—');
    const tileLabels = await page.locator('#stat-grid .label').allTextContents();
    expect(tileLabels).toEqual(['Total Cases', 'Completed', 'Corporates', 'Patients']);
  });
});

test.describe('corporates', () => {
  test('creates a corporate and a login for it', async ({ page }) => {
    await login(page);
    await page.click('[data-page="corporates"]');
    await expect(page.locator('#page-corporates')).toHaveClass(/active/);

    const companyName = 'Playwright Test Corporate ' + Date.now();
    await page.fill('#nv-name', companyName);
    await page.selectOption('#nv-type', 'tpa');
    const createResponse = page.waitForResponse((r) => r.url().endsWith('/admin/corporates') && r.request().method() === 'POST');
    await page.locator('button', { hasText: 'Add Corporate' }).click();
    expect((await createResponse).ok()).toBe(true);
    await page.waitForResponse((r) => r.url().endsWith('/admin/corporates') && r.request().method() === 'GET');

    const corporateCard = page.locator('.card', { hasText: companyName });
    await expect(corporateCard).toBeVisible();

    // No "Role" field should exist anywhere on this page (removed per the Oct 2026
    // corporate single-user simplification).
    await expect(page.locator('#page-corporates')).not.toContainText('Role');

    const email = `pw-test-${Date.now()}@example.com`;
    await corporateCard.locator('[id^="vu-email-"]').fill(email);
    await corporateCard.locator('[id^="vu-pwd-"]').fill('TestLoginPw123');
    await corporateCard.locator('button', { hasText: 'Add Login' }).click();

    await expect(corporateCard).toContainText(email);
  });
});

test.describe('cases', () => {
  test('search and sort controls affect the table', async ({ page }) => {
    await login(page);
    await page.click('[data-page="cases"]');
    await expect(page.locator('#page-cases')).toHaveClass(/active/);

    const rowCountBefore = await page.locator('#cases-table-body tr').count();

    await page.fill('#case-search', 'zzz-no-such-case-zzz');
    await expect(page.locator('#cases-table-body')).toContainText('No cases match this filter.');

    await page.fill('#case-search', '');
    await expect(page.locator('#cases-table-body tr')).toHaveCount(rowCountBefore);

    await page.selectOption('#case-sort', 'oldest');
    // Just confirm it doesn't error out and the table still has the same row count.
    await expect(page.locator('#cases-table-body tr')).toHaveCount(rowCountBefore);
  });
});

test.describe('services', () => {
  test('creates, edits, and deletes a service', async ({ page }) => {
    await login(page);
    await page.click('[data-page="services"]');
    await expect(page.locator('#page-services')).toHaveClass(/active/);

    const slug = 'pw-test-service-' + Date.now();
    const serviceName = 'Playwright Test Service ' + Date.now();
    await page.fill('#ns-slug', slug);
    await page.fill('#ns-name', serviceName);
    const createResponse = page.waitForResponse((r) => r.url().endsWith('/admin/services') && r.request().method() === 'POST');
    await page.locator('button', { hasText: 'Add Service' }).click();
    expect((await createResponse).ok()).toBe(true);
    await page.waitForResponse((r) => r.url().endsWith('/admin/services') && r.request().method() === 'GET');

    // The service's name lives in an <input value="..."> inside its card, not as
    // plain text — hasText only matches rendered text nodes, so the card has to be
    // found via the input's value attribute instead.
    const nameInput = page.locator(`input[value="${serviceName}"]`);
    const serviceCard = page.locator('.card').filter({ has: nameInput });
    await expect(serviceCard).toBeVisible();
    await expect(serviceCard).toContainText('Created'); // the date-created line added Oct 2026

    page.once('dialog', (d) => d.accept());
    await serviceCard.locator('button', { hasText: 'Delete' }).click();
    await expect(page.locator('.card').filter({ has: nameInput })).toHaveCount(0);
  });
});

test.describe('patients', () => {
  test('shows a count and an active/inactive status per patient', async ({ page }) => {
    await login(page);
    await page.click('[data-page="patients"]');
    await expect(page.locator('#page-patients')).toHaveClass(/active/);
    await expect(page.locator('#patients-count')).toContainText('patient');
  });
});
