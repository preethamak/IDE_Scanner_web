import { expect, test } from "@playwright/test";

const surfaces = [
  ["/", /The security check before you click Install/i],
  ["/registry", /Browse completed extension analysis/i],
  ["/analyze", /Check a file you already have/i],
  ["/cli", /See what is already inside your editor/i],
  ["/workspace", /Turn extension changes into an evidence queue/i],
  ["/monitor", /Watch the release/i],
  ["/account", /Keep watching after the first scan/i],
  ["/benchmark", /Regression evidence with its limits intact/i],
] as const;

for (const [path, heading] of surfaces) {
  test(`${path} remains usable on a phone viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("Registry search is the primary public route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search extensions" }).first().fill("vyper guard");
  await page.getByRole("button", { name: /Search extensions/i }).first().click({ noWaitAfter: true });
  await expect(page).toHaveURL(/\/registry\?q=vyper(?:%20|\+)guard/);
});

test("legacy discovery routes preserve the customer journey", async ({ page }) => {
  await page.goto("/public-scan");
  await expect(page).toHaveURL(/\/registry$/);
  await page.goto("/catalog?q=vyper%20guard");
  await expect(page).toHaveURL(/\/registry\?q=vyper(?:%20|\+)guard/);
  await page.goto("/scan?mode=upload");
  await expect(page).toHaveURL(/\/analyze\?mode=upload/);
});

test("extension profile and report use one current outcome", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot");
  await expect(page.getByText("Scan result", { exact: true })).toBeVisible();
  await expect(page.getByText("REVIEW NEEDED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Primary severity", { exact: true })).toHaveCount(0);
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByText("Review needed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Operational action", { exact: true })).toHaveCount(0);
});

test("release comparison discloses and verifies its analysis baseline", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0#changes");
  await expect(page.getByText("What changed in 1.388.0")).toBeVisible();
  await expect(page.locator(".changeDashboard")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Mixed analysis baseline")).toBeVisible();
  await expect(page.getByText("Files", { exact: true }).last()).toBeVisible();
});
