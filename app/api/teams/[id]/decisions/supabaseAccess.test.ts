import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ visible: vi.fn(), shared: vi.fn(), rpc: vi.fn(), scan: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: async () => ({ user: { id: "reviewer" }, provider: "supabase", db: { userScoped: true } }) }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: vi.fn(), asUuid: (value: string) => value, teamDecision: (value: string) => value }));
vi.mock("@/lib/teamApiError", () => ({ teamApiError: () => ({ error: "failed", status: 500 }) }));
vi.mock("@/lib/productData", () => ({ getVersionScanProduct: mocks.visible }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: (table: string) => ({ select: () => ({ eq: () => table === "scans" ? { maybeSingle: mocks.scan } : { eq: () => ({ maybeSingle: mocks.shared }) } }) }), rpc: mocks.rpc }) }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: vi.fn(), saveState: vi.fn() }));
vi.mock("@/lib/cloudflarePrivate", () => ({ newId: vi.fn(), nowIso: vi.fn(), privateDb: vi.fn() }));
vi.mock("@/lib/cloudflareScanAccess", () => ({ getCloudflareAccessibleScanIdentity: vi.fn() }));
import { POST } from "./route";
const call = () => POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ scan_id: "private-id", decision: "review" }) }), { params: Promise.resolve({ id: "team-a" }) });
describe("Supabase scan access for decisions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.scan.mockResolvedValue({ data: { extension_id: "pub.ext", version: "1" }, error: null }); mocks.shared.mockResolvedValue({ data: null, error: null }); mocks.visible.mockResolvedValue(null); mocks.rpc.mockResolvedValue({ data: { created: true, decision: { id: "decision" }, audit_receipt: { id: "receipt" } }, error: null }); });
  it("denies a private scan absent from the reviewer and team", async () => { expect((await call()).status).toBe(404); expect(mocks.rpc).not.toHaveBeenCalled(); });
  it("allows a scan visible to the requester", async () => { mocks.visible.mockResolvedValue({ scan: { id: "private-id" } }); expect((await call()).status).toBe(201); expect(mocks.rpc).toHaveBeenCalled(); });
  it("allows an existing team decision to be updated", async () => { mocks.shared.mockResolvedValue({ data: { scan_id: "private-id" }, error: null }); expect((await call()).status).toBe(201); expect(mocks.visible).not.toHaveBeenCalled(); });
});
