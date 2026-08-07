import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ constructEvent: vi.fn(), rpc: vi.fn(), from: vi.fn(), retrieveCustomer: vi.fn() }));
vi.mock("@/lib/billing", () => ({ stripeClient: () => ({ webhooks: { constructEvent: mocks.constructEvent }, customers: { retrieve: mocks.retrieveCustomer } }) }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/plans", () => ({ planForPrice: () => "team" }));
import { POST } from "./route";

const request = () => new Request("http://localhost/api/billing/webhook", { method: "POST", headers: { "stripe-signature": "signed" }, body: "raw-body" });
const checkoutEvent = { id: "evt_checkout", type: "checkout.session.completed", created: 1_786_118_400, data: { object: { customer: "cus_1", client_reference_id: "team-1", metadata: { team_id: "team-1" } } } };

describe("Stripe webhook reconciliation", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.constructEvent.mockReset(); mocks.rpc.mockReset(); mocks.from.mockReset();
  });

  it("rejects an invalid signature before touching billing state", async () => {
    mocks.constructEvent.mockImplementation(() => { throw new Error("bad signature"); });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("claims and finishes a verified event exactly once", async () => {
    mocks.constructEvent.mockReturnValue(checkoutEvent);
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ team_id: "team-1", provider_customer_id: "cus_1" }), { onConflict: "team_id" });
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "claim_billing_webhook_event", expect.objectContaining({ event_id: "evt_checkout" }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "finish_billing_webhook_event", expect.objectContaining({ succeeded: true }));
  });

  it("acknowledges a duplicate without replaying reconciliation", async () => {
    mocks.constructEvent.mockReturnValue(checkoutEvent);
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, duplicate: true });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("marks a claimed event failed so Stripe can retry it", async () => {
    mocks.constructEvent.mockReturnValue(checkoutEvent);
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: null });
    mocks.from.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: new Error("database unavailable") }) });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocks.rpc).toHaveBeenLastCalledWith("finish_billing_webhook_event", expect.objectContaining({ succeeded: false, failure_message: "database unavailable" }));
  });
});
