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

test("public reports expose evidence export and release monitoring actions", async ({ page }) => {
  await page.goto("/extensions/GitHub.copilot/versions/1.388.0");
  await expect(page.getByRole("link", { name: /Monitor release/i })).toHaveAttribute("href", "/monitor?extension=GitHub.copilot");
  await expect(page.getByRole("link", { name: /Export evidence/i })).toHaveAttribute("href", /\/api\/extensions\/GitHub\.copilot\/versions\/1\.388\.0\/export/);
});
