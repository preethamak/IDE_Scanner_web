import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const canonicalRoutes = [
  "/", "/about", "/account", "/analyze", "/benchmark", "/cli", "/design-partners", "/design-system", "/ide", "/metrics", "/monitor", "/pricing", "/privacy", "/registry", "/reports", "/research", "/scoring", "/security", "/settings", "/solutions/ai-agent-security", "/solutions/developers", "/solutions/engineering-teams", "/solutions/security-teams", "/status", "/workspace", "/extensions/GitHub.copilot", "/extensions/GitHub.copilot/versions/1.388.0", "/publishers/GitHub",
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`all canonical routes render in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("guardrails-theme", value), theme);
    for (const route of canonicalRoutes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} returned an error`).toBeLessThan(500);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("body")).toBeVisible();
    }
  });
}

test("theme preference persists, supports system, and updates without reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Theme: system/i }).click();
  await page.getByRole("menuitemradio", { name: /Light/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Theme: light/i }).click();
  await page.getByRole("menuitemradio", { name: /System/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const theme of ["light", "dark"] as const) {
  for (const route of ["/", "/registry", "/analyze", "/pricing", "/status", "/extensions/GitHub.copilot/versions/1.388.0"] as const) {
    test(`${route} has no serious accessibility violations in ${theme}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("guardrails-theme", value), theme);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(route);
      const report = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = report.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      expect(blocking, blocking.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
    });
  }
}

test("reduced motion keeps the landing background static", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
});
