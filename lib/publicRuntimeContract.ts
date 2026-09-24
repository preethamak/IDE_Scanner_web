type ValueMap = Record<string, unknown>;

/**
 * Public/benchmark evidence is allowed to publish only after the scanner has
 * either executed the capability-gated runtime or explicitly determined that
 * the artifact does not require execution. This is intentionally shared by
 * both callback backends so D1 and Supabase cannot drift.
 */
export function publicRuntimeError(metadata: ValueMap, analysisCoverage: ValueMap, extensionId = ""): string | null {
  if (String(metadata.profile || "") !== "deep") return "Public scans require the deep runtime-enabled profile.";
  const intelligence = objectValue(metadata.intelligence_snapshot);
  const dynamicRuntime = objectValue(intelligence.dynamic_sandbox);
  if (dynamicRuntime.status !== "executed"
    || dynamicRuntime.execution !== "controlled-bubblewrap"
    || dynamicRuntime.runtime_policy !== "capability-gated-v1"
    || dynamicRuntime.executed !== true
    || dynamicRuntime.external_syscall_trace_available !== true) {
    return "Public scans require controlled runtime execution and external syscall tracing capability.";
  }
  const dynamicProvider = objectValue(objectValue(analysisCoverage.providers).dynamic_sandbox);
  if (dynamicProvider.required === true) {
    const authenticatedEntrypointError = isAuthenticatedEntrypointError(metadata, extensionId);
    if (dynamicProvider.status !== "completed"
      || dynamicProvider.executed !== true
      || dynamicProvider.execution !== "controlled-bubblewrap"
      || dynamicProvider.policy !== "capability-gated-v1"
      || (dynamicProvider.runtime_run_status !== "completed" && !authenticatedEntrypointError)
      || dynamicProvider.external_syscall_trace !== true
      || dynamicRuntime.external_syscall_trace !== true) {
      return "Public scans require completed controlled runtime coverage with external syscall evidence for executable capabilities.";
    }
    return null;
  }
  if (dynamicProvider.required === false) {
    if (dynamicProvider.status !== "not-applicable"
      || dynamicProvider.executed !== false
      || dynamicProvider.policy !== "capability-gated-v1"
      || dynamicProvider.external_syscall_trace !== false
      || dynamicRuntime.external_syscall_trace !== false) {
      return "Public scans require an explicit capability-gated runtime decision.";
    }
    return null;
  }
  return "Public scans require explicit dynamic runtime provider coverage.";
}

/**
 * Some VS Code entrypoints exit non-zero without the editor host while still
 * producing a valid Bubblewrap observation trace. The scanner keeps that
 * failed receipt visible; publication may accept it only when the immutable
 * per-extension observations identify an entrypoint error and no timeout or
 * sandbox failure.
 */
function isAuthenticatedEntrypointError(metadata: ValueMap, extensionId: string): boolean {
  if (!extensionId) return false;
  const dynamicRuntime = objectValue(objectValue(metadata.intelligence_snapshot).dynamic_sandbox);
  const observedKinds = objectValue(dynamicRuntime.observed_kinds);
  const entry = Object.entries(observedKinds).find(([id]) => id.toLowerCase() === extensionId.toLowerCase())?.[1];
  if (!Array.isArray(entry)) return false;
  const kinds = new Set(entry.map((kind) => String(kind)));
  return kinds.has("runtime_entrypoint_error")
    && !kinds.has("runtime_timeout")
    && !kinds.has("sandbox_error");
}

function objectValue(value: unknown): ValueMap {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ValueMap : {};
}
