export function isNotificationEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
export function emailDeliveryConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL); }
export function emailPayload(alert: Record<string, unknown>, recipient: string) {
  const extension = String(alert.extension_id || "extension"); const version = String(alert.version || ""); const severity = String(alert.severity || "INFORMATIONAL");
  return { from: process.env.NOTIFICATION_FROM_EMAIL, to: [recipient], subject: `[GuardRails] ${severity}: ${String(alert.title || "Monitoring alert")}`, text: `${String(alert.summary || "")}\n\nArtifact: ${extension}@${version}\nOpen evidence: ${(process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app")}/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}` };
}
