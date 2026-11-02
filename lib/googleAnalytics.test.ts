import { afterEach, describe, expect, it, vi } from "vitest";
import { GA_ID, setGoogleAnalyticsEnabled, trackGoogleEvent } from "./googleAnalytics";

afterEach(() => vi.unstubAllGlobals());
describe("consented Google Analytics events", () => {
  it("records funnel events only after consent", () => {
    const gtag = vi.fn();
    const getItem = vi.fn().mockReturnValue("denied");
    vi.stubGlobal("window", { gtag, localStorage: { getItem } });
    trackGoogleEvent("public_search_submitted", { query_length: 12 });
    expect(gtag).not.toHaveBeenCalled();
    getItem.mockReturnValue("granted");
    trackGoogleEvent("public_search_submitted", { query_length: 12 });
    expect(gtag).toHaveBeenCalledWith("event", "public_search_submitted", { query_length: 12 });
  });
  it("disables an already loaded tag when consent is revoked", () => {
    const gtag = vi.fn();
    const browser = { gtag, localStorage: { getItem: () => "granted" } };
    vi.stubGlobal("window", browser);
    setGoogleAnalyticsEnabled(false);
    expect(browser).toHaveProperty(`ga-disable-${GA_ID}`, true);
    trackGoogleEvent("workspace_signup_started", { source_route: "/registry" });
    expect(gtag).not.toHaveBeenCalled();
    setGoogleAnalyticsEnabled(true);
    trackGoogleEvent("workspace_signup_started", { source_route: "/registry" });
    expect(gtag).toHaveBeenCalledTimes(1);
  });
  it("does not interrupt actions when storage is unavailable", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); } } });
    expect(() => trackGoogleEvent("workspace_created", {})).not.toThrow();
  });
  it("is safe during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(() => trackGoogleEvent("workspace_created", {})).not.toThrow();
    expect(() => setGoogleAnalyticsEnabled(false)).not.toThrow();
  });
});
