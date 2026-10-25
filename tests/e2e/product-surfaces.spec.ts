import { expect, test } from "@playwright/test";

const surfaces = [
  ["/", /Know what an extension can do before you let it in/i],
  ["/registry", /Know what runs\s+in your editor/i],
  ["/analyze", /Start with what\s+you actually have/i],
  ["/cli", /Audit every VS Code-based editor on your machine/i],
  ["/workspace", /Keep every release decision beside its evidence/i],
  ["/monitor", /Approve once\.\s*Return only when it changes/i],
  ["/account", /Know what changed\.\s*Keep the decision/i],
  ["/benchmark", /A benchmark that shows what it cannot prove/i],
] as const;

for (const [path, heading] of surfaces) {
  test(`${path} remains usable on a phone viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.locator("h1")).toHaveText(heading);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("Registry search is the primary public route", async ({ page }) => {
  await page.route("**/api/marketplace/search?q=vyper%20guard", (route) => route.fulfill({ json: { query: "vyper guard", exact_match: { extension_id: "acme.vyper-guard", version: "1.0.0", display_name: "Vyper Guard", publisher: "Acme", publisher_verified: true, registry: "vs-marketplace", match_reason: "exact_identity" }, matching_extensions: [], related_extensions: [] } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Find an extension" }).first().fill("vyper guard");
  await page.getByRole("button", { name: "Check extension" }).first().click({ noWaitAfter: true });
  const profile = page.getByRole("link", { name: "Open Vyper Guard extension profile" });
  await expect(profile).toHaveAttribute("href", "/extensions/acme.vyper-guard");
});

test("Workspace explains the team decision outcome before sign-in", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.locator("h1")).toHaveText(/Keep every release decision beside its evidence/);
  await expect(page.getByText("Cline", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Create your workspace/i })).toHaveAttribute("href", "/account?next=/workspace");
  await expect(page.getByRole("link", { name: "Browse public reports" })).toHaveAttribute("href", "/registry");
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
  await expect(page.getByText("Current release", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read Analysis Report", exact: true })).toBeVisible();
  await expect(page.getByText("Primary severity", { exact: true })).toHaveCount(0);
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByText("Analyzed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Operational action", { exact: true })).toHaveCount(0);
});

test("public security summary stays concise and immutable reports remain shareable", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByText("Extension Security Summary", { exact: true })).toBeVisible();
  await expect(page.getByText("Raw evidence", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Sign in for Full Analysis/i })).toBeVisible();
  const action = page.getByRole("link", { name: /Sign in for Full Analysis/i });
  const next = new URL(await action.getAttribute("href") || "", "http://localhost").searchParams.get("next");
  expect(next).toMatch(/^\/extensions\/GitHub\.copilot\/versions\/1\.388\.0\/scans\/[^/]+$/);
  await page.goto(next!);
  await expect(page.getByText("Immutable Deep Scan report", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link", exact: true })).toBeVisible();
});

test("Registry cards lead to the public extension profile", async ({ page }) => {
  await page.goto("/registry");
  const profile = page.locator('a[aria-label^="Open "][aria-label$=" extension profile"]').first();
  await expect(profile).toHaveAttribute("href", /^\/extensions\/[^/]+$/);
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
  await page.getByRole("button", { name: "Find extension" }).click();
  await expect(page.getByRole("link", { name: /Open First result extension profile/i })).toBeVisible();

  await search.fill("second");
  await page.getByRole("button", { name: "Find extension" }).click();
  await expect(page.getByRole("status", { name: "Searching the Extension Registry…" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open First result extension profile/i })).toHaveCount(0);
  releaseSecondSearch?.();
  await expect(page.getByRole("link", { name: /Open Second result extension profile/i })).toBeVisible();
});

test("phone navigation keeps sign-in accessible without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/extensions/GitHub.copilot");
  const navigation = page.getByRole("button", { name: "Open navigation" });
  const signIn = page.getByRole("link", { name: /Sign in/ });
  await expect(navigation).toBeVisible();
  await navigation.click();
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/account");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("release comparison discloses when no analyzed baseline exists", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot");
  await expect(page.getByText("A Permission Diff appears after two releases complete analysis.")).toBeVisible();
  await expect(page.getByText("A newer release never inherits an older result.")).toBeVisible();
});
