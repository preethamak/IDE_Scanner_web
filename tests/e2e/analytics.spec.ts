import { expect, test } from "@playwright/test";

test("Google Analytics loads only after consent and CSP permits its endpoints", async ({ page }) => {
  let tagRequests = 0;
  await page.route("https://www.googletagmanager.com/gtag/js?*", route => {
    tagRequests++;
    return route.fulfill({ contentType: "application/javascript", body: "/* mocked: no analytics data transmitted */" });
  });
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] || "";
  expect(policy).toContain("https://www.googletagmanager.com");
  expect(policy).toContain("https://www.google-analytics.com");
  await expect(page.getByRole("button", { name: "Allow analytics", exact: true })).toBeVisible();
  expect(tagRequests).toBe(0);
  await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
  await expect.poll(() => tagRequests).toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("guardrails-consent"))).toBe("granted");
});

test("declining optional analytics leaves the Google tag absent", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue without", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("guardrails-consent"))).toBe("denied");
  await expect(page.locator("#gtag-script")).toHaveCount(0);
});

test("revoking consent disables the already loaded library", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("guardrails-consent", "granted"));
  await page.route("https://www.googletagmanager.com/gtag/js?*", route => route.fulfill({ contentType: "application/javascript", body: "/* mocked */" }));
  await page.goto("/privacy#analytics");
  await expect(page.locator("#gtag-script")).toHaveCount(1);
  await page.getByRole("button", { name: "Turn off analytics", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>)["ga-disable-G-TRTLLGPJ5C"])).toBe(true);
  await expect(page.locator("#gtag-script")).toHaveCount(0);
});
