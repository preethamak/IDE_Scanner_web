import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// These are browser/API-boundary regressions, not a production integration
// certification. Stateful responses let a reload prove that the UI reads the
// server's decision instead of keeping a client-only success message.
const extensionId = "qa.release-review";
const version = "1.2.3";
const scanId = "11111111-1111-4111-8111-111111111111";
const newerScanId = "22222222-2222-4222-8222-222222222222";
const decisionId = "decision-release-review";
const exactReport = `/extensions/${extensionId}/versions/${version}/scans/${scanId}`;
const handoff = `/workspace?intent=monitor&extension=${extensionId}&version=${version}&scanId=${scanId}`;
const review = `/workspace?view=inbox&scanId=${scanId}`;

async function installWorkspace(
  page: Page,
  { role = "owner", failFirstDecision = false } = {},
) {
  const decisionRequests: Record<string, unknown>[] = [];
  const watchRequests: Record<string, unknown>[] = [];
  let storedDecision = {
    id: decisionId,
    scan_id: scanId,
    extension_id: extensionId,
    version,
    decision: "review",
    rationale: "",
    assigned_to: null,
    due_at: null,
    resolved_at: null as string | null,
    updated_at: "2026-11-07T00:00:00.000Z",
  };
  await page.addInitScript(() => {
    localStorage.setItem("guardrails-consent", "denied");
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/auth/session") {
      return json({ user: { id: "reviewer-1", email: "reviewer@example.com", provider: "cloudflare" } });
    }
    if (path === "/api/teams") {
      return json({ teams: [{ id: "team-1", name: "Release reviewers", slug: "reviewers", role }] });
    }
    const team = "/api/teams/team-1";
    if (path === `${team}/decisions`) {
      if (request.method() !== "POST") return json({ decisions: [storedDecision] });
      const payload = request.postDataJSON() as Record<string, unknown>;
      decisionRequests.push(payload);
      if (failFirstDecision && decisionRequests.length === 1) {
        return json({ error: "Decision service temporarily unavailable." }, 503);
      }
      storedDecision = {
        ...storedDecision,
        decision: String(payload.decision),
        rationale: String(payload.rationale),
        resolved_at: "2026-11-07T00:10:00.000Z",
        updated_at: "2026-11-07T00:10:00.000Z",
      };
      return json({ ...storedDecision, audit_receipt: { event_id: "audit-review-1", recorded_at: storedDecision.updated_at } });
    }
    if (path === `${team}/decisions/${decisionId}/evidence`) {
      return json({ scan: { id: scanId, version, analysis_status: "complete", capabilities: [], coverage_percent: 100, artifact_sha256: "a".repeat(64) } });
    }
    if (path === `${team}/watchlist`) {
      if (request.method() === "POST") {
        watchRequests.push(request.postDataJSON() as Record<string, unknown>);
        return json({ extension_id: extensionId, baseline_version: version, baseline_scan_id: scanId, monitoring_state: "monitoring" }, 201);
      }
      return json({ items: [{ extension_id: extensionId, created_at: "2026-11-07T00:00:00.000Z", baseline_version: "1.2.2", monitoring_state: "monitoring" }], health: { status: "unknown", last_checked_at: null, next_check_at: null, cadence_hours: 6, error: null } });
    }
    if (path === `${team}/members`) return json({ members: [{ user_id: "reviewer-1", role }] });
    if (path === `${team}/alerts`) return json({ alerts: [] });
    if (path === `${team}/badges`) return json({ badges: [] });
    if (path === `${team}/release-events`) return json({ events: [] });
    if (path === `${team}/monitoring-preferences`) return json({});
    if (path === `${team}/notification-channels`) return json({ channels: [], deliveries: [], digest_deliveries: [], configured: false });
    // A later scan of the SAME version must never replace the handoff/review scan.
    if (path === `/api/extensions/${extensionId}`) {
      return json({ extension: { extension_id: extensionId }, scan: { id: newerScanId, version }, versions: [{ version, latest_scan_id: newerScanId, scan_state: "complete" }] });
    }
    if (path === `/api/extensions/${extensionId}/versions`) {
      return json({ versions: [{ version, latest_scan_id: newerScanId, scan_state: "complete" }] });
    }
    return json({}, 404);
  });
  return { decisionRequests, watchRequests };
}

test("report monitoring handoff saves its original scan even after the same version is rescanned", async ({ page }) => {
  const { watchRequests } = await installWorkspace(page);
  await page.goto(handoff);
  await expect(page.getByRole("button", { name: "Monitor this release", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Monitor this release", exact: true }).click();
  await expect.poll(() => watchRequests.length).toBe(1);
  expect(watchRequests[0]).toEqual({ extension_id: extensionId, version, baseline_scan_id: scanId });
  expect(watchRequests[0].baseline_scan_id).not.toBe(newerScanId);
});

test("an exact-scan review preserves rationale on failure and records a durable decision after retry", async ({ page }) => {
  const { decisionRequests } = await installWorkspace(page, { failFirstDecision: true });
  await page.goto(review);
  const dialog = page.getByRole("dialog", { name: extensionId, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Open files, commands, and network evidence/i })).toHaveAttribute("href", exactReport);
  const allow = dialog.getByRole("button", { name: "Allow release", exact: true });
  await expect(allow).toBeDisabled();
  const rationale = "Reviewed the retained artifact and accepted this release under the team policy.";
  await dialog.getByRole("textbox", { name: /Decision rationale/i }).fill(rationale);
  await allow.click();
  await expect(dialog.getByRole("alert")).toContainText("Decision not recorded");
  await expect(dialog.getByRole("textbox", { name: /Decision rationale/i })).toHaveValue(rationale);
  await expect(dialog.getByText("Recorded successfully", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(dialog.getByText("Recorded successfully", { exact: true })).toBeVisible();
  await expect(dialog.getByText("audit-review-1", { exact: true })).toBeVisible();
  expect(decisionRequests).toHaveLength(2);
  expect(decisionRequests[0]).toEqual({ scan_id: scanId, decision: "allow", rationale, assigned_to: null, due_at: null });
  expect(decisionRequests[1]).toEqual(decisionRequests[0]);
  await page.reload();
  await page.getByRole("button", { name: "Decisions", exact: true }).click();
  const recorded = page.locator("article").filter({ hasText: extensionId });
  await expect(recorded).toContainText(version);
  await expect(recorded).toContainText("Allow");
});

test("a viewer can inspect the pinned review but cannot submit a team decision", async ({ page }) => {
  const { decisionRequests } = await installWorkspace(page, { role: "viewer" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(review);
  const dialog = page.getByRole("dialog", { name: extensionId, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Open files, commands, and network evidence/i })).toHaveAttribute("href", exactReport);
  await expect(dialog.getByText(/Viewer role can inspect evidence but cannot record/i)).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: /Decision rationale/i })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Allow release", exact: true })).toHaveCount(0);
  expect(decisionRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const close = dialog.getByRole("button", { name: "Close release review", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("a delayed response from the previous workspace cannot replace the selected workspace", async ({ page }) => {
  await installWorkspace(page);
  await page.route("**/api/teams", (route) => route.fulfill({ json: { teams: [
    { id: "team-1", name: "Release reviewers", slug: "reviewers", role: "owner" },
    { id: "team-2", name: "Other reviewers", slug: "other-reviewers", role: "owner" },
  ] } }));
  let oldRequestStarted = false;
  let releaseOld!: () => void;
  let oldRequestFinished!: () => void;
  const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
  const oldFinished = new Promise<void>((resolve) => { oldRequestFinished = resolve; });
  await page.route("**/api/teams/team-1/decisions", async (route) => {
    oldRequestStarted = true;
    await oldGate;
    try {
      await route.fulfill({ json: { decisions: [{
        id: "old-team-review", scan_id: scanId, extension_id: extensionId, version,
        decision: "review", due_at: null, resolved_at: null,
        updated_at: "2026-11-07T00:00:00.000Z",
      }] } });
    } catch {
      // Cancelling the old request is also a valid way to prevent stale state.
    } finally {
      oldRequestFinished();
    }
  });
  await page.route("**/api/teams/team-2/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith("/decisions") ? { decisions: [{
      id: "new-team-review", scan_id: newerScanId, extension_id: "qa.other-team", version: "2.0.0",
      decision: "review", due_at: null, resolved_at: null,
      updated_at: "2026-11-07T00:00:00.000Z",
    }] } : path.endsWith("/watchlist") ? { items: [], health: { status: "unknown", last_checked_at: null, next_check_at: null, cadence_hours: 6, error: null } }
      : path.endsWith("/notification-channels") ? { channels: [], deliveries: [], digest_deliveries: [], configured: false }
        : { alerts: [], members: [], badges: [], events: [] };
    return route.fulfill({ json: body });
  });
  await page.goto("/workspace?view=inbox");
  await expect.poll(() => oldRequestStarted).toBe(true);
  await page.getByRole("button", { name: /Release reviewers/ }).click();
  await page.getByRole("option", { name: /Other reviewers/ }).click();
  await expect(page.getByRole("heading", { name: "qa.other-team", exact: true })).toBeVisible();
  releaseOld();
  await oldFinished;
  await expect(page.getByRole("heading", { name: "qa.other-team", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: extensionId, exact: true })).toHaveCount(0);
});
