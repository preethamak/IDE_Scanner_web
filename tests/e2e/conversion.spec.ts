import { expect, test } from "@playwright/test";

const reportPath = "/extensions/GitHub.copilot/versions/1.388.0?source=registry#overview";

test("signed-out full analysis preserves the exact public report return target", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ user: null }) }));
  await page.goto(reportPath);
  const action = page.getByRole("link", { name: /Sign in for Full Analysis/i });
  await expect(action).toBeVisible();
  const next = new URL(await action.getAttribute("href") || "", "http://localhost").searchParams.get("next");
  expect(next).toMatch(/^\/extensions\/GitHub\.copilot\/versions\/1\.388\.0\/scans\/[^/]+$/);
});

test("public report stays readable and provides the full-analysis next step", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByText("Extension Security Summary", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in for Full Analysis/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Read README and releases/i })).toHaveAttribute("href", "/extensions/GitHub.copilot");
});

test("Registry search leads with the public profile", async ({ page }) => {
  await page.route("**/api/marketplace/search?q=GitHub.copilot", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ query: "GitHub.copilot", exact_match: { extension_id: "GitHub.copilot", version: "1.388.0", display_name: "GitHub Copilot", publisher: "GitHub", publisher_verified: true, registry: "vs-marketplace", match_reason: "exact_identity" }, matching_extensions: [], related_extensions: [] }) }));
  await page.goto("/registry?q=GitHub.copilot");
  const profile = page.getByRole("link", { name: /Open GitHub Copilot extension profile/i });
  await expect(profile).toHaveAttribute("href", "/extensions/GitHub.copilot");
  await expect(profile).not.toHaveClass(/primary/);
  await expect(profile).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("signed-out Deep Scan remains connected to account creation if availability cannot be checked", async ({ page }) => {
  await page.route("**/api/deep-scans/health", (route) => route.abort("failed"));
  await page.route("**/api/deep-scans?extension_id=e2e.guest-scan&version=1.0.0", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Authentication required" }) }));
  await page.goto("/extensions/e2e.guest-scan");
  await expect(page.getByRole("button", { name: /Try 5 free scans/i })).toBeVisible();
  await expect(page.getByText(/could not check Deep Scan availability/i)).not.toBeVisible();
});

test("unavailable Deep Scan runner has an explicit non-submitting state", async ({ page }) => {
  await page.route("**/api/deep-scans/health", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ accepting_requests: false, status: "configuration_unavailable" }) }));
  await page.route("**/api/deep-scans?extension_id=e2e.guest-scan&version=1.0.0", (route) => route.fulfill({ status: 204 }));
  await page.goto("/extensions/e2e.guest-scan");
  await expect(page.getByRole("button", { name: "Deep Scan unavailable" })).toBeDisabled();
  await expect(page.getByText("Deep Scan is temporarily unavailable. No scan job was created.")).toBeVisible();
});

test("a guest Deep Scan follows the exact release through completion to its report", async ({ page }) => {
  const reportPath = "/extensions/e2e.guest-scan/versions/1.0.0/scans/0975989d-c11f-4830-9bfb-082e732fad1a";
  let submittedPayload: Record<string, unknown> | undefined;

  await page.route("**/api/deep-scans/health", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ accepting_requests: true, status: "ready" }),
  }));
  await page.route("**/api/deep-scans?extension_id=e2e.guest-scan&version=1.0.0", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ guest_trial_available: true, guest_trial_remaining: 5, guest_trial_limit: 5 }),
  }));
  await page.route("**/api/deep-scans", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ id: "guest-job-1", status: "queued", trial_remaining: 4 }),
    });
  });
  await page.route("**/api/deep-scans/guest-job-1", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ status: "complete", report_url: reportPath, guest_trial_available: true, guest_trial_remaining: 4 }),
  }));
  await page.route(`**${reportPath}`, (route) => route.fulfill({
    contentType: "text/html",
    body: "<!doctype html><html><head><title>Analysis Report</title></head><body><main><h1>Guest Analysis Report</h1><p>Exact release: e2e.guest-scan 1.0.0</p></main></body></html>",
  }));

  await page.goto("/extensions/e2e.guest-scan");
  await page.getByRole("button", { name: /Try 5 free scans/i }).click();

  await expect(page).toHaveURL(new RegExp(`${reportPath.replaceAll("/", "\\/")}$`), { timeout: 30_000 });
  // The client router requests RSC; reload to exercise the mocked document handoff.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Guest Analysis Report" })).toBeVisible();
  expect(submittedPayload).toEqual({ extension_id: "e2e.guest-scan", version: "1.0.0", force: false });
});
