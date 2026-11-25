import { expect, test } from "@playwright/test";

test("anonymous visitors cannot open admin pages or export account data", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?next=/);
  await expect(page.getByRole("heading", { name: "Analytics summary", exact: true })).toHaveCount(0);
  for (const path of ["users", "users/all?format=csv", "content", "jobs", "llm"]) {
    const response = await request.get(`/api/admin/${path}`);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("first-party analytics follows consent and minimizes transmitted route data", async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/analytics/events", async route => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.route("https://www.googletagmanager.com/gtag/js?*", route => route.fulfill({ contentType: "application/javascript", body: "/* mocked */" }));
  await page.goto("/privacy?token=private");
  await expect(page.getByRole("button", { name: "Allow analytics", exact: true }).first()).toBeVisible();
  expect(bodies).toHaveLength(0);
  await page.getByRole("button", { name: "Allow analytics", exact: true }).first().click();
  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  expect(bodies[0].path).toBe("/privacy");
  expect(JSON.stringify(bodies)).not.toContain("token=private");
  await page.getByRole("button", { name: "Turn off analytics", exact: true }).click();
  const count = bodies.length;
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(bodies).toHaveLength(count);
});
