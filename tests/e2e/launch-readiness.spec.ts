import { expect, test } from "@playwright/test";

const publicRoutes = [
  ["/", /The security check before you click Install/i],
  ["/registry", /Browse completed extension analysis/i],
  ["/benchmark", /Regression evidence with its limits intact/i],
] as const;

for (const [path, heading] of publicRoutes) {
  test(`launch public route ${path} is usable on desktop and mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("launch conversion gates preserve public reports and expose the next action", async ({ page }) => {
  await page.route("**/api/deep-scans/health", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ accepting_requests: true, status: "ready" }) }));
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByRole("link", { name: /Create workspace to monitor/i })).toHaveAttribute("href", "/account?next=%2Fmonitor%3Fextension%3DGitHub.copilot");
  await expect(page.getByRole("link", { name: /Export evidence/i })).toHaveAttribute("href", /\/api\/extensions\/GitHub\.copilot\/versions\/1\.388\.0\/export/);
  await expect(page.getByRole("button", { name: /Create free workspace to Deep Scan/i })).toBeVisible();

  await page.goto("/workspace");
  await expect(page.getByRole("link", { name: /Create your workspace/i })).toBeVisible();
  await page.goto("/monitor?extension=GitHub.copilot");
  await expect(page.getByRole("link", { name: /Create free workspace/i })).toBeVisible();
});
