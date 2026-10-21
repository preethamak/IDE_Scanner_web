import { describe, expect, it } from "vitest";
import { getLocalCapabilityGraph } from "@/lib/localCapabilityCollector";

describe("local capability collector client", () => {
  it("accepts only a bounded collector graph from the loopback endpoint", async () => {
    const fetchImpl = async (url: URL | RequestInfo, init?: RequestInit) => {
      expect(String(url)).toBe("http://127.0.0.1:17865/capability-graph");
      expect(init?.headers).toEqual({ Accept: "application/json" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response(JSON.stringify({ subjects: [], relationships: [] }), { status: 200 });
    };
    await expect(getLocalCapabilityGraph(fetchImpl)).resolves.toEqual({ subjects: [], relationships: [] });
  });

  it("does not treat malformed local responses as collector data", async () => {
    await expect(getLocalCapabilityGraph(async () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }))).rejects.toThrow("did not return a capability graph");
  });
});
