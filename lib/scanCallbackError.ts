const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520]);
const TRANSIENT_MARKERS = [
  "cloudflare",
  "gateway.supabase.co",
  "status 520",
  "web server is returning an unknown error",
  "fetch failed",
  "connection terminated",
  "connection reset",
  "statement timeout",
  "canceling statement due to statement timeout",
];

export function isTransientScanCallbackError(error: unknown): boolean {
  const record = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const status = Number(record.status ?? record.statusCode);
  if (Number.isInteger(status) && TRANSIENT_STATUSES.has(status)) return true;

  const detail = [
    error instanceof Error ? error.message : "",
    record.message,
    record.details,
    record.hint,
  ].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
  return TRANSIENT_MARKERS.some((marker) => detail.includes(marker));
}
