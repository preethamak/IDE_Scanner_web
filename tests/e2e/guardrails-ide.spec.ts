import { expect, test } from "@playwright/test";

test("GuardRails IDE demonstrates deny, allow, and approval decisions", async ({ page }) => {
  await page.goto("/ide");

  await expect(page.locator("h1")).toContainText("Give every tool");
  await expect(page.getByText("Browser prototype—not an OS sandbox")).toBeVisible();
  await expect(page.getByText("No ambient authority. Add a grant to change the decision.")).toBeVisible();

  await page.getByRole("button", { name: /Read source file/ }).click();
  await page.getByRole("button", { name: "Simulate request" }).click();
  const decisionPanel = page.getByText("Decision preview").locator("..");
  await expect(decisionPanel.getByText("deny", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add scoped grant" }).click();
  await page.getByRole("button", { name: "Simulate request" }).click();
  await expect(decisionPanel.getByText("allow", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Read environment file" }).click();
  await page.getByRole("button", { name: "Simulate request" }).click();
  await expect(decisionPanel.getByText("deny", { exact: true })).toBeVisible();
  await expect(decisionPanel.locator("code")).toContainText("protected-environment-files");
  await page.getByRole("button", { name: "Run test command" }).click();
  await page.getByRole("button", { name: "Simulate request" }).click();
  await page.getByRole("button", { name: "Add scoped grant" }).click();
  await page.getByRole("button", { name: "Simulate request" }).click();
  await expect(decisionPanel.getByText("prompt", { exact: true })).toBeVisible();
});
