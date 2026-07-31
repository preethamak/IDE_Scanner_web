import { expect, test } from "@playwright/test";

const reportPath = "/extensions/GitHub.copilot/versions/1.388.0?source=catalog#overview";

test("signed-out Deep Scan preserves the exact public report return target", async ({ page }) => {
  await page.route("**/api/deep-scans/health", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ available: true }) }));
  await page.route("**/api/deep-scans?extension_id=GitHub.copilot&version=1.388.0", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Authentication required" }) }));
  await page.goto(reportPath);
  const action = page.getByRole("button", { name: /Create free workspace to Deep Scan/i });
  await expect(action).toBeVisible();
  await expect(page.getByText(/Free workspaces save exact-version reports, monitoring, and your review queue/i)).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(/\/account\?next=/);
  const next = new URL(page.url()).searchParams.get("next");
  expect(next).toBe(reportPath);
});

test("public reports expose evidence export and an account-aware monitoring action", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByRole("link", { name: /Create workspace to monitor/i })).toHaveAttribute("href", "/account?next=%2Fmonitor%3Fextension%3DGitHub.copilot");
  await expect(page.getByRole("link", { name: /Export evidence/i })).toHaveAttribute("href", /\/api\/extensions\/GitHub\.copilot\/versions\/1\.388\.0\/export/);
});

test("anonymous catalog results make workspace creation the primary scan action", async ({ page }) => {
  await page.route("**/api/marketplace/search?q=GitHub.copilot", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ query: "GitHub.copilot", exact_match: { extension_id: "GitHub.copilot", version: "1.388.0", display_name: "GitHub Copilot", publisher: "GitHub", publisher_verified: true, registry: "vs-marketplace", match_reason: "exact_identity" }, matching_extensions: [], related_extensions: [] }) }));
  await page.goto("/catalog?q=GitHub.copilot");
  const actions = page.locator(".discoveryActions");
  const action = actions.getByRole("link", { name: /Create workspace to Deep Scan/i });
  await expect(action).toHaveAttribute("href", /\/account\?next=/);
  await expect(actions.getByRole("link", { name: "Open public report" })).toHaveAttribute("href", "/extensions/GitHub.copilot/versions/1.388.0");
  await expect(actions.getByRole("link", { name: "Monitor", exact: true })).toHaveAttribute("href", "/monitor?extension=GitHub.copilot");
});

test("unavailable Deep Scan runner has an explicit non-submitting state", async ({ page }) => {
  await page.route("**/api/deep-scans/health", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ available: false }) }));
  await page.route("**/api/deep-scans?extension_id=GitHub.copilot&version=1.388.0", (route) => route.fulfill({ status: 204 }));
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByRole("button", { name: "Deep Scan paused" })).toBeDisabled();
  await expect(page.getByText("The analysis runner is offline. No scan job was created.")).toBeVisible();
});
