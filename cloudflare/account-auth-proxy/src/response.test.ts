import { describe, expect, it } from "vitest";
import { rewriteAccountDocument } from "./response";

describe("Cloudflare account auth proxy", () => {
  it("keeps the consent banner from intercepting account auth controls", () => {
    const html = "<html><head></head><body>auth</body></html>";

    const rewritten = rewriteAccountDocument(html);

    expect(rewritten).toContain('data-account-auth-overlay-fix="true"');
    expect(rewritten).toContain(".accountModern{padding-bottom:180px!important}");
    expect(rewritten).toContain(
      'aside[aria-label="Analytics cookie consent"]{pointer-events:none!important}',
    );
    expect(rewritten).toContain(
      'aside[aria-label="Analytics cookie consent"] button,aside[aria-label="Analytics cookie consent"] a{pointer-events:auto!important}',
    );
  });

  it("does not inject the account fix twice", () => {
    const html = "<html><head></head><body>auth</body></html>";

    const once = rewriteAccountDocument(html);
    const twice = rewriteAccountDocument(once);

    expect(twice).toBe(once);
  });
});
