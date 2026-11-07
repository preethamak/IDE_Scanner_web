import { expect, test, type Route } from "@playwright/test";

const product = (id = "example.first") => ({
  extension: { id, display_name: id === "example.first" ? "First extension" : "Second extension", publisher: "Example", registry: "vs-marketplace" },
  versions: ["3.0.0", "2.0.0", "1.0.0"].map((version) => ({ version, latest_scan_id: `scan-${id}-${version}` })),
});

function comparison(from: string, to: string) {
  return {
    comparable: true,
    from: { scan_id: `scan-${from}`, decision: "allow", files: 1, findings: 0, coverage_percent: 100 },
    to: { scan_id: `scan-${to}`, decision: "allow", files: 1, findings: 0, coverage_percent: 100 },
    attribution: { evidence_changes: false, provenance_known: false },
    changes: { outcome: { coverage: { from: 0, to: 100, changed: true } }, files: { changed: Array.from({ length: 9 }, (_, index) => ({ path: `changed-${index + 1}.js` })), total_changed: 9 } },
  };
}

async function fulfillComparison(route: Route) {
  const query = new URL(route.request().url()).searchParams;
  await route.fulfill({ json: comparison(query.get("from")!, query.get("to")!) });
}

test("comparison defaults to the nearest prior release and clears stale evidence on edits", async ({ page }) => {
  await page.route("**/api/extensions/example.first", (route) => route.fulfill({ json: product() }));
  await page.route("**/api/extensions/example.first/compare?*", fulfillComparison);
  await page.goto("/compare?extension=example.first");
  await expect(page.getByLabel("Comparison baseline")).toHaveValue("2.0.0");
  await expect(page.getByLabel("Release to inspect")).toHaveValue("3.0.0");
  await page.getByRole("button", { name: "Compare releases", exact: true }).click();
  const results = page.locator(".comparisonResult");
  await expect(results).toContainText("Comparing 2.0.0 with 3.0.0");
  await expect(results).toContainText("Scanner provenance unavailable");
  await expect(results).toContainText("0 → 100");
  await expect(results.getByText("changed-9.js")).toHaveCount(0);
  await results.getByRole("button", { name: "Show all 9 available changes" }).click();
  await expect(results.getByText("changed-9.js")).toBeVisible();
  await page.getByLabel("Comparison baseline").selectOption("1.0.0");
  await expect(results).toHaveCount(0);
  await page.getByRole("button", { name: "Compare releases", exact: true }).click();
  await expect(results).toContainText("Comparing 1.0.0 with 3.0.0");
  await page.getByLabel("Publisher.extension ID").fill("example.second");
  await expect(results).toHaveCount(0);
  await expect(page.getByLabel("Comparison baseline")).toHaveCount(0);
});

test("a slow comparison cannot replace evidence requested after a version edit", async ({ page }) => {
  let releaseOld: (() => void) | undefined;
  let oldStarted = false;
  let oldFinished = false;
  await page.route("**/api/extensions/example.first", (route) => route.fulfill({ json: product() }));
  await page.route("**/api/extensions/example.first/compare?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("from") === "2.0.0") {
      oldStarted = true;
      await new Promise<void>((resolve) => { releaseOld = resolve; });
      await fulfillComparison(route).catch(() => undefined);
      oldFinished = true;
    } else await fulfillComparison(route);
  });
  await page.goto("/compare?extension=example.first");
  await page.getByRole("button", { name: "Compare releases", exact: true }).click();
  await expect.poll(() => oldStarted).toBe(true);
  await page.getByLabel("Comparison baseline").selectOption("1.0.0");
  await page.getByRole("button", { name: "Compare releases", exact: true }).click();
  await expect(page.locator(".comparisonResult")).toContainText("Comparing 1.0.0 with 3.0.0");
  releaseOld?.();
  await expect.poll(() => oldFinished).toBe(true);
  await expect(page.locator(".comparisonResult")).toContainText("Comparing 1.0.0 with 3.0.0");
  await expect(page.locator(".releaseCard").first().getByRole("link")).toHaveAttribute("href", /versions\/1\.0\.0\/scans\/scan-1\.0\.0$/);
});

test("a slow extension lookup cannot overwrite a different loaded extension", async ({ page }) => {
  let releaseOld: (() => void) | undefined;
  let oldStarted = false;
  let oldFinished = false;
  await page.route("**/api/extensions/example.first", async (route) => {
    oldStarted = true;
    await new Promise<void>((resolve) => { releaseOld = resolve; });
    await route.fulfill({ json: product() }).catch(() => undefined);
    oldFinished = true;
  });
  await page.route("**/api/extensions/example.second", (route) => route.fulfill({ json: product("example.second") }));
  await page.goto("/compare?extension=example.first");
  await expect.poll(() => oldStarted).toBe(true);
  await page.getByLabel("Publisher.extension ID").fill("example.second");
  await page.getByRole("button", { name: "Load releases", exact: true }).click();
  await expect(page.locator(".releaseSelectorIntro")).toContainText("Second extension");
  releaseOld?.();
  await expect.poll(() => oldFinished).toBe(true);
  await expect(page.locator(".releaseSelectorIntro")).toContainText("Second extension");
  await expect(page.getByLabel("Publisher.extension ID")).toHaveValue("example.second");
});

test("immutable report scan pins survive comparison only for their original extension and versions", async ({ page }) => {
  const calls: URLSearchParams[] = [];
  await page.route("**/api/extensions/example.first", (route) => route.fulfill({ json: product() }));
  await page.route("**/api/extensions/example.second", (route) => route.fulfill({ json: product("example.second") }));
  await page.route("**/api/extensions/*/compare?*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    calls.push(query);
    const body = comparison(query.get("from")!, query.get("to")!);
    if (query.has("fromScanId")) body.from.scan_id = query.get("fromScanId")!;
    if (query.has("toScanId")) body.to.scan_id = query.get("toScanId")!;
    await route.fulfill({ json: body });
  });
  await page.goto("/compare?extension=example.first&from=2.0.0&to=3.0.0&fromScanId=baseline-audit&toScanId=target-audit");
  const compare = page.getByRole("button", { name: "Compare releases", exact: true });
  const results = page.locator(".comparisonResult");
  await compare.click();
  await expect(results.locator(".releaseCard").last().getByRole("link")).toHaveAttribute("href", /\/scans\/target-audit$/);
  expect(calls[0].get("fromScanId")).toBe("baseline-audit");
  expect(calls[0].get("toScanId")).toBe("target-audit");
  await page.getByLabel("Release to inspect").selectOption("1.0.0");
  await compare.click();
  await expect(results).toContainText("Comparing 2.0.0 with 1.0.0");
  expect(calls[1].get("fromScanId")).toBe("baseline-audit");
  expect(calls[1].has("toScanId")).toBe(false);
  await page.getByLabel("Comparison baseline").selectOption("3.0.0");
  await compare.click();
  await expect(results).toContainText("Comparing 3.0.0 with 1.0.0");
  expect(calls[2].has("fromScanId")).toBe(false);
  await page.getByLabel("Publisher.extension ID").fill("example.second");
  await page.getByRole("button", { name: "Load releases", exact: true }).click();
  await compare.click();
  await expect(results).toContainText("Second extension");
  expect(calls[3].has("fromScanId")).toBe(false);
  expect(calls[3].has("toScanId")).toBe(false);
});
