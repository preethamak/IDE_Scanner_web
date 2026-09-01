import { expect, test, type Page } from "@playwright/test";

const STORE_KEY = "ide-scanner.importedReports.v1";

const reportFixture = {
  id: "browser-audit",
  name: "browser-audit.zip",
  importedAt: 1,
  metadata: {
    scan_id: "browser-audit",
    created_at: "2026-09-01T00:00:00.000Z",
    scanner_version: "test",
    ruleset_version: "test",
    profile: "local",
    source: "test",
    total_extensions: 2,
    completed_extensions: 2,
    incomplete_extensions: 0,
  },
  summary: {
    summary: {
      total_extensions: 2,
      clean: 1,
      review: 1,
      suspicious: 0,
      malicious: 0,
      max_risk_score: 62,
      max_malware_score: 0,
      posture_status: "not-run",
      decision_counts: { allow: 1, review: 1, block: 0, incomplete: 0 },
    },
    top_risk_extensions: [],
    finding_counts: {},
    severity_counts: {},
    category_counts: {},
  },
  leaderboard: {
    extensions: [
      {
        extension_id: "publisher.review",
        name: "Review Extension",
        publisher: "Publisher",
        version: "1.2.3",
        decision: "review",
        verdict: "review",
        verdict_label: "Review needed",
        severity: "HIGH",
        coverage_percent: 92,
        scan_incomplete: false,
        baseline_changed: true,
        risk_score: 62,
        malware_score: 0,
        activation_summary: "on startup",
        dependency_count: 2,
        top_findings: ["network.request"],
        detail_ref: "extensions/publisher.review.json",
      },
      {
        extension_id: "publisher.allow",
        name: "Allowed Extension",
        publisher: "Publisher",
        version: "2.0.0",
        decision: "allow",
        verdict: "clean",
        verdict_label: "No blocking evidence",
        severity: "LOW",
        coverage_percent: 100,
        scan_incomplete: false,
        baseline_changed: false,
        risk_score: 4,
        malware_score: 0,
        activation_summary: "on command",
        dependency_count: 0,
        top_findings: [],
        detail_ref: "extensions/publisher.allow.json",
      },
    ],
  },
  posture: { posture_summary: { status: "not-run", score: 0, counts: {} }, posture: [] },
  rules: { ruleset_version: "test", rules: [] },
  details: {},
};

function installReport(page: Page) {
  return page.addInitScript(({ key, fixture }) => {
    window.localStorage.setItem(key, JSON.stringify([fixture]));
  }, { key: STORE_KEY, fixture: reportFixture });
}

test("report controls stay readable in empty, populated, and mobile states", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "No reports saved on this device." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Import or analyze" })).toBeVisible();

  await installReport(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Continue where you left off." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open report" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Import report" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Open report" }).click();
  await expect(page.getByRole("heading", { name: "browser-audit" })).toBeVisible();
  await expect(page.getByPlaceholder("Search extensions")).toBeVisible();
  await page.getByPlaceholder("Search extensions").fill("review");
  await expect(page.getByRole("link", { name: "Details" })).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "browser-audit" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.locator(".leaderboardTable").evaluate((node) => node.scrollWidth)).toBeGreaterThanOrEqual(390);
});

test("shared feedback and consent controls expose readable focused states", async ({ page }) => {
  await page.goto("/reports");
  const feedback = page.getByRole("button", { name: "Feedback" });
  await feedback.focus();
  await expect(feedback).toBeFocused();
  await feedback.click();
  await expect(page.getByRole("dialog", { name: /make the next decision clearer/i })).toBeVisible();
  await page.getByRole("button", { name: "Close feedback" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const consent = page.getByLabel("Analytics cookie consent");
  await expect(consent).toBeVisible();
  await expect(consent.getByRole("button", { name: "Allow analytics" })).toBeVisible();
  await expect(consent.getByRole("button", { name: "Continue without" })).toBeVisible();
  await consent.getByRole("button", { name: "Continue without" }).click();
  await expect(consent).toHaveCount(0);
});

test("visible report and chrome controls meet the normal-text contrast floor", async ({ page }) => {
  await page.goto("/reports");
  const failures = await page.evaluate(() => {
    const parse = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const blend = (front: { r: number; g: number; b: number; a: number }, back: { r: number; g: number; b: number; a: number }) => {
      const alpha = front.a + back.a * (1 - front.a);
      if (!alpha) return { r: 255, g: 255, b: 255, a: 1 };
      return { r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha, g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha, b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha, a: alpha };
    };
    const luminance = (color: { r: number; g: number; b: number }) => [color.r, color.g, color.b].map((channel) => channel / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground: { r: number; g: number; b: number }, background: { r: number; g: number; b: number }) => {
      const light = luminance(foreground);
      const dark = luminance(background);
      return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
    };
    const visible = (node: Element) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const effectiveBackground = (node: Element) => {
      let result = { r: 255, g: 255, b: 255, a: 0 };
      for (let current: Element | null = node; current; current = current.parentElement) {
        const color = parse(getComputedStyle(current).backgroundColor);
        if (color && color.a > 0) result = blend(color, result);
        if (result.a >= 0.99) break;
      }
      return result.a >= 0.99 ? result : blend({ r: 255, g: 255, b: 255, a: 1 }, result);
    };
    return [...document.querySelectorAll("button, a")]
      .filter((node) => visible(node) && (node.textContent?.trim() || node.getAttribute("aria-label")))
      .map((node) => {
        const style = getComputedStyle(node);
        const foreground = parse(style.color);
        const background = effectiveBackground(node);
        return { label: node.textContent?.trim() || node.getAttribute("aria-label"), ratio: foreground ? contrast(foreground, background) : 0 };
      })
      .filter((item) => item.ratio < 4.5);
  });
  expect(failures).toEqual([]);
});
