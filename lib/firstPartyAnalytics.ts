import { analyticsPath, campaignValue, referrerHost } from "./admin/validation";
import { ANALYTICS_CONSENT_KEY } from "./googleAnalytics";
/** Small, same-origin adapter. Only explicit event names and normalized routes reach storage. */
export function sendFirstPartyEvent(name: string, path: string): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted" || path.startsWith("/admin")) return;
    const query = new URLSearchParams(window.location.search);
    void fetch("/api/analytics/events", {
      method: "POST", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, path: analyticsPath(path), consent: "granted", referrer: referrerHost(document.referrer) ? `https://${referrerHost(document.referrer)}` : "", utm_source: campaignValue(query.get("utm_source")), utm_medium: campaignValue(query.get("utm_medium")), utm_campaign: campaignValue(query.get("utm_campaign")) }),
    }).catch(() => undefined);
  } catch { /* Analytics is optional, including in restricted browsers. */ }
}
