export function isNotificationEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
export function emailDeliveryConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL); }
export function emailPayload(alert: Record<string, unknown>, recipient: string) {
  const extension = String(alert.extension_id || "extension"); const version = String(alert.version || ""); const severity = String(alert.severity || "INFORMATIONAL"); const metadata = object(alert.metadata);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app";
  if (metadata.release_event === true) {
    const baseline = String(metadata.baseline_version || "reviewed baseline"); const state = String(metadata.release_state || "release_detected");
    const summary = state === "analysis_incomplete" ? "Analysis is incomplete. This release is not approved." : state === "analysis_failed" ? "Analysis failed before a comparison could be produced." : `New release detected. Comparing ${baseline} to ${version} after Deep Scan completes.`;
    return { from: process.env.NOTIFICATION_FROM_EMAIL, to: [recipient], subject: `[GuardRails] Release change: ${extension}@${version}`, text: `${summary}\n\nReviewed baseline: ${extension}@${baseline}\nNew artifact: ${extension}@${version}\nState: ${state.replaceAll("_", " ")}\n\nOpen evidence: ${site}/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}` };
  }
  return { from: process.env.NOTIFICATION_FROM_EMAIL, to: [recipient], subject: `[GuardRails] ${severity}: ${String(alert.title || "Monitoring alert")}`, text: `${String(alert.summary || "")}\n\nArtifact: ${extension}@${version}\nOpen evidence: ${site}/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}` };
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
