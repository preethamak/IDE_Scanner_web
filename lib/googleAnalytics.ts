export const GA_ID = "G-TRTLLGPJ5C";
export const ANALYTICS_CONSENT_KEY = "guardrails-consent";
type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void; "ga-disable-G-TRTLLGPJ5C"?: boolean };

export function setGoogleAnalyticsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow[`ga-disable-${GA_ID}`] = !enabled;
}

export function trackGoogleEvent(name: string, properties: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  try {
    const analyticsWindow = window as AnalyticsWindow;
    if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted" || analyticsWindow[`ga-disable-${GA_ID}`]) return;
    analyticsWindow.gtag?.("event", name, properties);
  } catch {
    // Storage restrictions and analytics failures must not interrupt product actions.
  }
}
