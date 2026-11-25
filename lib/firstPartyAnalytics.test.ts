import { afterEach, describe, expect, it, vi } from "vitest";
import { sendFirstPartyEvent } from "./firstPartyAnalytics";
afterEach(() => vi.unstubAllGlobals());
describe("optional first-party telemetry", () => {
  it("sends nothing before consent or after revocation, including product actions", () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("window", { localStorage: { getItem: () => "denied" } });
    sendFirstPartyEvent("page_view", "/registry"); expect(fetch).not.toHaveBeenCalled();
  });
  it("sends a minimized event to the same origin and never sends admin visits", () => {
    const fetch = vi.fn().mockResolvedValue({}); vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("window", { localStorage: { getItem: () => "granted" }, location: { search: "?token=secret&utm_campaign=person@example.test" } });
    vi.stubGlobal("document", { referrer: "https://example.test/private?token=secret" });
    sendFirstPartyEvent("page_view", "/workspace/private-team?token=secret");
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[0][0]).toBe("/api/analytics/events");
    expect(payload.path).toBe("/workspace/[detail]"); expect(payload.referrer).toBe("https://example.test"); expect(payload.utm_campaign).toBe("");
    sendFirstPartyEvent("page_view", "/admin/users"); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
