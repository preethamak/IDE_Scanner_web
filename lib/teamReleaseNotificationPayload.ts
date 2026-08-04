type ReleaseAlert = Record<string, unknown>;
export function teamReleaseNotification(alert: ReleaseAlert) {
  const metadata = object(alert.metadata); const site = process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app";
  const extension = String(alert.extension_id || ""); const target = String(alert.version || ""); const baseline = String(metadata.baseline_version || "reviewed baseline"); const state = String(metadata.release_state || "release_detected");
  const summary = state === "analysis_incomplete" ? "Analysis is incomplete. This release is not approved." : state === "analysis_failed" ? "Analysis failed before a comparison could be produced." : `New release detected. Comparing ${baseline} to ${target} after Deep Scan completes.`;
  return { text: `${extension}@${target}: ${summary}`, blocks: [{ type: "header", text: { type: "plain_text", text: "GuardRails · release change", emoji: true } }, { type: "section", text: { type: "mrkdwn", text: `*${escape(extension)}*\n${escape(baseline)} → ${escape(target)}\n${escape(summary)}` } }, { type: "context", elements: [{ type: "mrkdwn", text: `State: *${escape(state.replaceAll("_", " "))}* · exact-artifact monitoring` }] }, { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Open evidence" }, url: `${site}/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(target)}` }] }] };
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function escape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
