import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), cloudflare: vi.fn(), owned: vi.fn(), version: vi.fn(), exact: vi.fn(), server: vi.fn(), legacy: {} }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.auth }));
vi.mock("@/lib/cloudflareDeepScan", () => ({ cloudflarePrivateAvailable: mocks.cloudflare, getCloudflareAuthorizedVersionProduct: mocks.owned }));
vi.mock("@/lib/cloudflarePrivate", () => ({ parseCookies: (header: string) => ({ gr_trial: header.split("gr_trial=")[1] || "" }) }));
vi.mock("@/lib/productData", () => ({ getVersionProduct: mocks.version, getVersionScanProduct: mocks.exact }));
vi.mock("@/lib/supabaseServer", () => ({ serverDb: mocks.server }));
vi.mock("@/lib/supabaseRuntime", () => ({ runtimeSupabase: () => mocks.legacy }));
import { requestScanEvidence } from "./requestScanEvidence";

describe("request-scoped evidence access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.cloudflare.mockReturnValue(true);
    mocks.auth.mockRejectedValue(new Error("signed out"));
    mocks.owned.mockResolvedValue(null);
    mocks.version.mockResolvedValue(null);
    mocks.exact.mockResolvedValue(null);
  });
  it("uses subscriber-scoped completed evidence for a signed-in user's version", async () => {
    mocks.auth.mockResolvedValue({ provider: "cloudflare", db: null, user: { id: "owner" } });
    mocks.owned.mockResolvedValue({ scan: { id: "own" } });
    expect(await (await requestScanEvidence(new Request("https://example.test")))("publisher.extension", "1")).toMatchObject({ scan: { id: "own" } });
    expect(mocks.owned).toHaveBeenCalledWith("publisher.extension", "1", "owner", "");
    expect(mocks.version).not.toHaveBeenCalled();
  });
  it("pins explicit scan IDs and never silently substitutes the latest report", async () => {
    const read = await requestScanEvidence(new Request("https://example.test"));
    expect(await read("publisher.extension", "1", "private-other-user")).toBeNull();
    expect(mocks.exact).toHaveBeenCalledWith("publisher.extension", "1", "private-other-user", mocks.legacy, { skipCloudflareCatalog: true, authorizedUserId: undefined, guestTrialToken: "" });
    expect(mocks.owned).not.toHaveBeenCalled();
    expect(mocks.version).not.toHaveBeenCalled();
  });
  it("keeps anonymous reads inside the public evidence boundary", async () => {
    mocks.version.mockResolvedValue({ scan: { id: "public" }, findings: [] });
    mocks.exact.mockResolvedValue({ scan: { id: "public" }, findings: [{ rule_id: "full-evidence" }] });
    const product = await (await requestScanEvidence(new Request("https://example.test")))("publisher.extension", "1");
    expect(product?.findings).toEqual([{ rule_id: "full-evidence" }]);
    expect(mocks.owned).not.toHaveBeenCalled();
  });
  it("passes guest ownership cookies to the same authorized lookup", async () => {
    await (await requestScanEvidence(new Request("https://example.test", { headers: { cookie: "gr_trial=guest-cookie" } })))("publisher.extension", "1");
    expect(mocks.owned).toHaveBeenCalledWith("publisher.extension", "1", undefined, "guest-cookie");
  });
  it("retains the caller's RLS client for the Supabase compatibility path", async () => {
    const client = { auth: {} };
    mocks.cloudflare.mockReturnValue(false);
    mocks.auth.mockResolvedValue({ provider: "supabase", db: client, user: { id: "legacy-owner" } });
    await (await requestScanEvidence(new Request("https://example.test")))("publisher.extension", "1");
    expect(mocks.version).toHaveBeenCalledWith("publisher.extension", "1", client);
    expect(mocks.owned).not.toHaveBeenCalled();
  });
});
