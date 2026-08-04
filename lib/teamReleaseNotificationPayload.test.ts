import { describe, expect, it } from "vitest";
import { teamReleaseNotification } from "@/lib/teamReleaseNotificationPayload";
describe("team release notification", () => { it("does not present incomplete analysis as approval", () => { const payload = teamReleaseNotification({ extension_id: "GitHub.copilot", version: "2.0.0", metadata: { baseline_version: "1.0.0", release_state: "analysis_incomplete" } }); expect(JSON.stringify(payload)).toContain("not approved"); expect(JSON.stringify(payload)).toContain("1.0.0"); }); });
