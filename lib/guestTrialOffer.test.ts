import { describe, expect, it } from "vitest";
import { GUEST_TRIAL_LIMIT, GUEST_TRIAL_WINDOW_DAYS, HACKATHON_TRIAL_LIMIT, guestTrialLimit } from "./guestTrialOffer";

describe("guest scan offers", () => {
  it("keeps the standard allowance at five scans", () => {
    expect(GUEST_TRIAL_LIMIT).toBe(5);
    expect(guestTrialLimit(new Request("https://abscissa.dev/registry"))).toBe(5);
  });

  it("grants ten scans for the activated hackathon pass", () => {
    const request = new Request("https://abscissa.dev/registry", {
      headers: { cookie: "other=1; gr_hackathon_pass=1" },
    });
    expect(guestTrialLimit(request)).toBe(HACKATHON_TRIAL_LIMIT);
  });

  it("does not treat a similarly named or malformed cookie as a pass", () => {
    expect(guestTrialLimit(new Request("https://abscissa.dev", {
      headers: { cookie: "gr_hackathon_pass=10; xgr_hackathon_pass=1" },
    }))).toBe(GUEST_TRIAL_LIMIT);
    expect(GUEST_TRIAL_WINDOW_DAYS).toBe(30);
  });
});
