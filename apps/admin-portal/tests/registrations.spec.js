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

// Submits a registration directly against the backend (same thing the corporate-portal's
// /register wizard does) so these tests don't depend on that app also running.
async function submitRegistration(email) {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API_BASE}/corporates/register`, {
    multipart: {
      company: JSON.stringify({
        companyName: 'Playwright Test Partner',
        companyType: 'tpa',
        country: 'IN',
        city: 'Pune',
        officialEmail: email,
        officialPhone: '+91 9876500000',
        contactName: 'Test Contact',
        contactDesignation: 'Manager',
        contactEmail: email,
        contactPhone: '+91 9876500000',
      }),
      bank: JSON.stringify({
        bankType: 'Domestic',
        bankName: 'Test Bank',
        accountHolder: 'Playwright Test Partner',
        accountNumber: '111122223333',
        ifsc: 'TEST0001234',
        branchName: 'Test Branch',
        branchAddress: 'Test Address',
      }),
    },
  });
  const body = await res.json();
  await ctx.dispose();
  return body;
}

test.describe('partner applications (superadmin)', () => {
  test('shows the nav item, lists a pending application, and approves it', async ({ page }) => {
    const email = uniqueEmail('e2e-partner');
    const reg = await submitRegistration(email);

    await openApp(page);
    await expect(page.locator('.nav-item[data-page="registrations"]')).toBeVisible();

    await page.click('.nav-item[data-page="registrations"]');
    const row = page.locator('#registrations-table-body tr', { hasText: reg.corporateId });
    await expect(row).toBeVisible();
    await expect(row.locator('.pill')).toHaveText('Pending Verification');

    await row.locator('button', { hasText: 'Review' }).click();
    await expect(page.locator('#registration-detail-card')).toContainText('Playwright Test Partner');
    await expect(page.locator('#registration-detail-card')).toContainText('111122223333'); // unmasked for admin

    page.once('dialog', (d) => d.accept());
    await page.locator('button', { hasText: 'Approve' }).click();
    await expect(page.locator('#registration-detail-card')).toContainText('waiting on the applicant');

    // Still "Pending Verification" in the list — approval alone isn't enough, the
    // applicant also has to verify their email before status becomes "Verified".
    await page.locator('button', { hasText: 'Back to applications' }).click();
    await expect(page.locator('#registrations-table-body tr', { hasText: reg.corporateId }).locator('.pill')).toHaveText('Pending Verification');
  });
});

test.describe('partner applications (regular admin)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('hides the nav item for a non-superadmin', async ({ page }) => {
    const email = uniqueEmail('e2e-regular-reg');
    const password = 'E2ERegularPass@123';

    const setupCtx = await request.newContext({ storageState: 'tests/.admin-auth.json' });
    const createRes = await setupCtx.post(`${API_BASE}/admin/admins`, {
      data: { name: 'E2E Regular Admin', email, password, role: 'admin' },
    });
    const { admin } = await createRes.json();
    await setupCtx.dispose();

    await page.goto(ADMIN_HTML_URL);
    await page.fill('#lg-email', email);
    await page.fill('#lg-pwd', password);
    await page.locator('button', { hasText: 'Log In' }).click();
    await expect(page.locator('#app-shell')).toBeVisible();

    await expect(page.locator('.nav-item[data-page="registrations"]')).toBeHidden();

    const cleanupCtx = await request.newContext({ storageState: 'tests/.admin-auth.json' });
    await cleanupCtx.delete(`${API_BASE}/admin/admins/${admin.id}`);
    await cleanupCtx.dispose();
  });
});
