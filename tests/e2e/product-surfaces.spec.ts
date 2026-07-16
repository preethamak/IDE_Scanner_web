import { expect, test } from "@playwright/test";

const surfaces = [
  ["/", /Know what enters the developer environment/i],
  ["/catalog", /Find the extension/i],
  ["/scan", /Inspect an extension before installation/i],
  ["/workspace", /Keep release changes and decisions together/i],
  ["/account", /Keep watching after the first scan/i],
  ["/benchmark", /Regression evidence with its limits intact/i],
] as const;

for (const [path, heading] of surfaces) {
  test(`${path} remains usable on a phone viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("Explore search is the primary public route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search extension intelligence" }).fill("vyper guard");
  await page.getByRole("button", { name: /Explore results/i }).click({ noWaitAfter: true });
  await expect(page).toHaveURL(/\/catalog\?q=vyper%20guard/);
});
