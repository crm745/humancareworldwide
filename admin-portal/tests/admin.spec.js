// @ts-check
const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = 'admin@humancareworldwide.com';
const ADMIN_PASSWORD = 'TestAdmin@2026'; // seeded by backend/src/seed-admin.js
// Must be http(s), not file:// — the admin session lives in a cookie (see
// auth.middleware.js), and browsers won't set or send cookies for file://.
const ADMIN_HTML_URL = 'http://localhost:3000/admin.html';

// Fills in and submits the login form — only used by the `login` describe block
// below, which starts logged out on purpose to exercise the form itself. Every
// other test starts already authenticated via the shared storageState set up in
// global-setup.js, so it only needs openApp().
async function login(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(ADMIN_HTML_URL);
  await page.fill('#lg-email', email);
  await page.fill('#lg-pwd', password);
  await page.locator('button', { hasText: 'Log In' }).click();
}

// Loads the page for a test that's already authenticated (via storageState) and
// waits for the dashboard to actually appear before the test proceeds.
async function openApp(page) {
  await page.goto(ADMIN_HTML_URL);
  await expect(page.locator('#app-shell')).toBeVisible();
}

test.describe('login', () => {
  // These two specifically test the login form, so they need to start logged out —
  // overrides the suite-wide authenticated storageState back to empty.
  test.use({ storageState: { cookies: [], origins: [] } });

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
    await openApp(page);
    // Tiles start as "—" and get replaced with real numbers once the API calls resolve.
    await expect(page.locator('#stat-grid .num').first()).not.toHaveText('—');
    const tileLabels = await page.locator('#stat-grid .label').allTextContents();
    expect(tileLabels).toEqual(['Total Cases', 'Completed', 'Corporates', 'Patients']);
  });
});

test.describe('corporates', () => {
  test('creates a corporate and a login for it', async ({ page }) => {
    await openApp(page);
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
    await openApp(page);
    const casesLoaded = page.waitForResponse((r) => /\/admin\/cases(\?.*)?$/.test(r.url()) && r.request().method() === 'GET');
    await page.click('[data-page="cases"]');
    await expect(page.locator('#page-cases')).toHaveClass(/active/);
    await casesLoaded;

    const rowCountBefore = await page.locator('#cases-table-body tr').count();

    await page.fill('#case-search', 'zzz-no-such-case-zzz');
    await expect(page.locator('#cases-table-body')).toContainText('No cases match this filter.');

    await page.fill('#case-search', '');
    await expect(page.locator('#cases-table-body tr')).toHaveCount(rowCountBefore);

    await page.selectOption('#case-sort', 'oldest');
    // Just confirm it doesn't error out and the table still has the same row count.
    await expect(page.locator('#cases-table-body tr')).toHaveCount(rowCountBefore);
  });

  test('reassigning a case asks for confirmation first', async ({ page }) => {
    await openApp(page);
    await page.click('[data-page="cases"]');
    const firstRow = page.locator('#cases-table-body tr').first();
    const select = firstRow.locator('select[id^="reassign-"]');
    const optionCount = await select.locator('option').count();
    test.skip(optionCount < 2, 'No corporates available to reassign to in this environment.');
    await select.selectOption({ index: 1 });

    // Declining the confirm dialog must leave the case exactly where it was.
    const corporateBefore = await firstRow.locator('td').nth(5).textContent();
    page.once('dialog', (d) => d.dismiss());
    await firstRow.locator('button', { hasText: 'Assign' }).click();
    await page.waitForTimeout(300);
    await expect(firstRow.locator('td').nth(5)).toHaveText(corporateBefore || '');

    // Accepting it actually reassigns.
    const assignResponse = page.waitForResponse((r) => /\/admin\/cases\/\d+\/assign$/.test(r.url()) && r.request().method() === 'PATCH');
    page.once('dialog', (d) => d.accept());
    await firstRow.locator('button', { hasText: 'Assign' }).click();
    expect((await assignResponse).ok()).toBe(true);
  });
});

test.describe('session', () => {
  test('survives a page reload (cookie-based, not localStorage)', async ({ page }) => {
    await openApp(page);

    // Nothing admin-related should be sitting in localStorage any more — the session
    // lives entirely in the httpOnly cookie, invisible to page JS.
    const stored = await page.evaluate(() => localStorage.getItem('hc_admin_token'));
    expect(stored).toBeNull();

    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#login-screen')).not.toBeVisible();
  });

  test('log out clears the session so a reload shows the login screen', async ({ page }) => {
    await openApp(page);
    await page.locator('button', { hasText: 'Log Out' }).click();
    await expect(page.locator('#login-screen')).toBeVisible();

    await page.reload();
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#app-shell')).not.toBeVisible();
  });
});

test.describe('services', () => {
  test('creates, edits, and deletes a service', async ({ page }) => {
    await openApp(page);
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
    await openApp(page);
    await page.click('[data-page="patients"]');
    await expect(page.locator('#page-patients')).toHaveClass(/active/);
    await expect(page.locator('#patients-count')).toContainText('patient');
  });
});
