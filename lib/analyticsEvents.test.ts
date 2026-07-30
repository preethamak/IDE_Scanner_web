import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@vercel/analytics", () => ({ track: mocks.track }));

import { trackProductEvent } from "@/lib/analyticsEvents";

describe("trackProductEvent", () => {
  beforeEach(() => mocks.track.mockReset());

  it("sends the typed event name and only its approved properties in the browser", () => {
    vi.stubGlobal("window", {});
    trackProductEvent({ name: "public_search_submitted", source_route: "/catalog", query_length: 12 });
    expect(mocks.track).toHaveBeenCalledWith("public_search_submitted", { source_route: "/catalog", query_length: 12 });
    vi.unstubAllGlobals();
  });

  it("is a server-safe no-op", () => {
    vi.stubGlobal("window", undefined);
    trackProductEvent({ name: "workspace_created", source_route: "/workspace" });
    expect(mocks.track).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
