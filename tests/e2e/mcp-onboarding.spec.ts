import { expect, test } from "@playwright/test";

test("MCP onboarding separates public evidence from authorized workspace reads", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/mcp");

  await expect(page.getByRole("heading", { level: 1, name: /Scan the VS Code extension package before you install it/i })).toBeVisible();
  const quickstart = page.getByRole("list", { name: "Connect GuardRails in three steps" });
  await expect(quickstart.getByText("Start with public evidence.")).toBeVisible();
  await expect(quickstart.getByText("Ask about an exact release.")).toBeVisible();
  await expect(quickstart.getByText("Authorize workspace reads only when needed.")).toBeVisible();
  await expect(page.getByText("workspace:read", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
