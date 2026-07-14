import { expect, test, type Page } from "@playwright/test";

const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }];

for (const viewport of viewports) {
  test(`header remains inside ${viewport.width}px viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await assertHeaderBounds(page, viewport.width);
  });
}

test("signed-in account control does not resize the header", async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: "test-user", role: "authenticated" })).toString("base64url");
  const accessToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
  const user = { id: "test-user", aud: "authenticated", role: "authenticated", email: "scanner-test@example.com", app_metadata: { provider: "google" }, user_metadata: {}, created_at: new Date().toISOString() };
  const session = JSON.stringify({ access_token: accessToken, refresh_token: "test-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user });
  await page.context().addCookies([{ name: "sb-kmdujtabqaxgoeltbxpq-auth-token", value: `base64-${Buffer.from(session).toString("base64url")}`, domain: "127.0.0.1", path: "/", sameSite: "Lax" }]);
  await page.route("**/auth/v1/user", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
  await assertHeaderBounds(page, 390);
  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(page.getByText("scanner-test@example.com")).toBeVisible();
});

async function assertHeaderBounds(page: Page, width: number) {
  const header = page.locator(".headerInner");
  await expect(header).toBeVisible();
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  await expect(page.locator(".headerCommands")).toBeVisible();
}
