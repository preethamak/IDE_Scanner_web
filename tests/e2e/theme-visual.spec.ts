import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  for (const [name, route] of [["landing", "/"], ["registry", "/registry"], ["pricing", "/pricing"], ["status", "/status"]] as const) {
    test(`${name} ${theme} visual`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("guardrails-theme", value), theme);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.025 });
    });
  }
}
