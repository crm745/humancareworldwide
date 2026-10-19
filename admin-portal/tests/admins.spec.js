// @ts-check
const { test, expect, request } = require('@playwright/test');

const ADMIN_HTML_URL = 'http://localhost:3000/admin.html';
const API_BASE = 'http://localhost:4000';

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function openApp(page) {
  await page.goto(ADMIN_HTML_URL);
  await expect(page.locator('#app-shell')).toBeVisible();
}

// Every test here starts authenticated as the seeded superadmin (default storageState
// from global-setup.js, same as the main admin.spec.js suite).
test.describe('admins page (superadmin)', () => {
  test('shows the Admins nav item and lets a superadmin add and remove an admin', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.nav-item[data-page="admins"]')).toBeVisible();

    await page.click('.nav-item[data-page="admins"]');
    await expect(page.locator('#page-admins')).toHaveClass(/active/);

    const email = uniqueEmail('e2e-admin');
    await page.fill('#na-name', 'E2E Test Admin');
    await page.fill('#na-email', email);
    await page.fill('#na-password', 'E2ETestPass@123');
    // role select left at its default ("admin")
    await page.click('button:has-text("Add Admin")');

    const row = page.locator('#admins-table-body tr', { hasText: email });
    await expect(row).toBeVisible();
    await expect(row.locator('.pill')).toHaveText('admin');

    page.once('dialog', (d) => d.accept());
    await row.locator('button:has-text("Remove")').click();
    await expect(page.locator('#admins-table-body tr', { hasText: email })).toHaveCount(0);
  });

  test('services page shows editable controls for a superadmin', async ({ page }) => {
    await openApp(page);
    await page.click('.nav-item[data-page="services"]');
    await expect(page.locator('[data-superadmin-only].card:has-text("Add a New Service")')).toBeVisible();
  });
});

// A regular admin has none of the above — verified against a throwaway account created
// via the API (as the superadmin), logged into in a fresh, unauthenticated context.
test.describe('admins page (regular admin)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('hides the Admins nav item and shows a read-only services catalog', async ({ page }) => {
    const email = uniqueEmail('e2e-regular');
    const password = 'E2ERegularPass@123';

    const setupCtx = await request.newContext({ storageState: 'tests/.admin-auth.json' });
    const createRes = await setupCtx.post(`${API_BASE}/admin/admins`, {
      data: { name: 'E2E Regular Admin', email, password, role: 'admin' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { admin } = await createRes.json();
    await setupCtx.dispose();

    await page.goto(ADMIN_HTML_URL);
    await page.fill('#lg-email', email);
    await page.fill('#lg-pwd', password);
    await page.locator('button', { hasText: 'Log In' }).click();
    await expect(page.locator('#app-shell')).toBeVisible();

    await expect(page.locator('.nav-item[data-page="admins"]')).toBeHidden();

    await page.click('.nav-item[data-page="services"]');
    await expect(page.locator('[data-superadmin-only].card:has-text("Add a New Service")')).toBeHidden();
    await expect(page.locator('[data-admin-only]')).toBeVisible();

    // Direct API calls are rejected too, not just the UI hidden — reuses the browser's
    // already-logged-in session cookie (via the page itself) instead of logging in
    // again, which would risk tripping the login rate limiter across the test run.
    const blockedStatus = await page.evaluate(async (base) => {
      const res = await fetch(base + '/admin/admins', { credentials: 'include' });
      return res.status;
    }, API_BASE);

    // Cleanup via the superadmin session regardless of the above assertion's outcome.
    const cleanupCtx = await request.newContext({ storageState: 'tests/.admin-auth.json' });
    await cleanupCtx.delete(`${API_BASE}/admin/admins/${admin.id}`);
    await cleanupCtx.dispose();

    expect(blockedStatus).toBe(403);
  });
});
