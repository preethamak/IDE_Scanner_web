const LOCAL_COLLECTOR_URL = "http://127.0.0.1:17865/capability-graph";
const LOCAL_COLLECTOR_TIMEOUT_MS = 10_000;

export async function getLocalCapabilityGraph(
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_COLLECTOR_TIMEOUT_MS);
  try {
    const response = await fetchImpl(LOCAL_COLLECTOR_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const graph: unknown = await response.json().catch(() => null);
    if (!response.ok || !isCollectorGraph(graph)) {
      throw new Error("The local collector did not return a capability graph. Start it from your workspace directory.");
    }
    return graph;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("The local collector did not respond within 10 seconds.");
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

function isCollectorGraph(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Array.isArray((value as Record<string, unknown>).subjects) &&
      Array.isArray((value as Record<string, unknown>).relationships),
  );
}
