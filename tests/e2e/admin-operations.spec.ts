import { test, expect } from '@playwright/test';

// Production SQL/state-machine behavior is exercised in admin-operations.test.mjs.
// These checks keep the actual HTTP/page access boundary covered in the browser.
test('expanded admin pages require a signed-in administrator', async ({ page, request }) => {
  for (const section of ['jobs', 'funnel', 'monitoring', 'accounts', 'keys', 'usage', 'access', 'audit', 'incidents', 'notices', 'quality', 'facts', 'studio']) {
    const response = await request.get(`/api/admin/operations/${section}`);
    expect(response.status(), section).toBe(401);
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  await page.goto('/admin/operations/studio');
  await expect(page).toHaveURL(/\/account\?next=/);
  const denied = await request.post('/api/admin/operations/approve', { data: { id: 'guess', revision: 1, claims_checked: true, reason: 'unauthorized' } });
  expect(denied.status()).toBe(401);
});
