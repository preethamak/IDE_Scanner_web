import { expect, test } from "@playwright/test";

const surfaces = [
  ["/", /The security check before you click Install/i],
  ["/registry", /Know what runs in your editor/i],
  ["/analyze", /Check a file you already have/i],
  ["/cli", /See what is already inside your editor/i],
  ["/workspace", /Keep every extension decision in one trusted place/i],
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

test("Workspace explains the team decision outcome before sign-in", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { name: "Your team’s next decisions" })).toBeVisible();
  await expect(page.getByText("GitHub Copilot", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Create your workspace/i })).toHaveAttribute("href", "/account?next=/workspace");
  await expect(page.getByRole("link", { name: "Explore Extension Registry" })).toHaveAttribute("href", "/registry");
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

test("public security summary stays concise and full analysis requires sign-in", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByText("Extension Security Summary", { exact: true })).toBeVisible();
  await expect(page.getByText("Raw evidence", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Sign in for Full Analysis/i })).toBeVisible();
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0/scans/0975989d-c11f-4830-9bfb-082e732fad1a");
  await expect(page).toHaveURL(/\/account\?next=/);
});

test("Registry cards lead to the public extension profile", async ({ page }) => {
  await page.goto("/registry");
  const profile = page.getByRole("link", { name: /Open GitHub Copilot extension profile/i });
  await expect(profile).toHaveAttribute("href", "/extensions/GitHub.copilot");
});

test("Registry search clears old results while a new request is pending", async ({ page }) => {
  let releaseSecondSearch: (() => void) | undefined;
  await page.route("**/api/marketplace/search?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    const item = (name: string, extension_id: string) => ({ extension_id, display_name: name, publisher: "publisher", publisher_display_name: "Publisher", publisher_verified: false, short_description: "Test extension", version: "1.0.0", last_updated: "", install_count: 0, rating_average: 0, rating_count: 0, icon_url: "", registry: "vs-marketplace", normalized_identity: extension_id, source: "registry", match_reason: "exact_name", icon_state: "fallback" });
    const respond = (name: string, extension_id: string) => route.fulfill({ json: { query, normalized_query: undefined, exact_match: item(name, extension_id), matching_extensions: [], related_extensions: [], results: [item(name, extension_id)], source: "registry" } });
    if (query === "second") {
      await new Promise<void>((resolve) => { releaseSecondSearch = () => { respond("Second result", "publisher.second"); resolve(); }; });
      return;
    }
    await respond("First result", "publisher.first");
  });
  await page.goto("/registry");
  const search = page.getByRole("textbox", { name: "Find an extension" });
  await search.fill("first");
  await page.getByRole("button", { name: "Search extensions" }).click();
  await expect(page.getByRole("link", { name: /Open First result extension profile/i })).toBeVisible();

  await search.fill("second");
  await page.getByRole("button", { name: "Search extensions" }).click();
  await expect(page.getByRole("status", { name: "Searching the Extension Registry…" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open First result extension profile/i })).toHaveCount(0);
  releaseSecondSearch?.();
  await expect(page.getByRole("link", { name: /Open Second result extension profile/i })).toBeVisible();
});

test("phone header keeps brand, navigation, and sign-in on one readable row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/extensions/GitHub.copilot");
  const navigation = page.getByRole("button", { name: "Open navigation" });
  const signIn = page.getByRole("link", { name: /Sign in/ });
  await expect(navigation).toBeVisible();
  await expect(signIn).toBeVisible();
  const [navigationBox, signInBox] = await Promise.all([navigation.boundingBox(), signIn.boundingBox()]);
  expect(navigationBox?.y).toBe(signInBox?.y);
  expect((navigationBox?.x || 0) + (navigationBox?.width || 0)).toBeLessThan(signInBox?.x || 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("release comparison discloses and verifies its analysis baseline", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0#changes");
  await expect(page.getByText("What changed in 1.388.0")).toBeVisible();
  await expect(page.locator(".changeDashboard")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Mixed analysis baseline")).toBeVisible();
  await expect(page.getByText("Files", { exact: true }).last()).toBeVisible();
});
