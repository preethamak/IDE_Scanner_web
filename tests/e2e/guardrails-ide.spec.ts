import { expect, test } from "@playwright/test";

test("GuardRails IDE demonstrates deny, allow, and approval decisions", async ({ page }) => {
  await page.goto("/ide");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Keep authority contained");
  await expect(page.getByText("Sandbox policy active")).toBeVisible();
  await expect(page.getByText("0 inherited env vars")).toBeVisible();

  await page.getByRole("button", { name: "Read source" }).click();
  await expect(page.getByText("ALLOW", { exact: true })).toBeVisible();
  await expect(page.getByText("workspace-source-read")).toBeVisible();

  await page.getByRole("button", { name: "Read .env" }).click();
  await expect(page.getByText("DENY", { exact: true })).toBeVisible();
  await expect(page.getByText("block-environment-files")).toBeVisible();

  await page.getByRole("button", { name: "Write patch" }).click();
  await expect(page.getByText("PROMPT", { exact: true })).toBeVisible();
  await expect(page.getByText("review-source-writes")).toBeVisible();

  await page.getByRole("button", { name: "Unknown egress" }).click();
  await expect(page.getByText("default-deny")).toBeVisible();
});
