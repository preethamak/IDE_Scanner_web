import { expect, test } from "@playwright/test";

const report = "/extensions/GitHub.copilot/versions/1.388.0";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`public report decision surface is stable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(report);
    await expect(page.getByText("Review needed", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Export evidence/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Monitor release/i })).toHaveAttribute("href", "/monitor?extension=GitHub.copilot");
    await expect(page.locator("main")).toHaveScreenshot(`public-report-${viewport.width}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
  });
}
