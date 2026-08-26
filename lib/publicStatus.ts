import { getDeepScanHealth } from "@/lib/deepScanHealth";
import { serviceDb } from "@/lib/supabase";
import { unstable_cache } from "next/cache";

export type ServiceState = "operational" | "degraded" | "outage" | "unknown";
export type PublicService = {
  id: string;
  name: string;
  description: string;
  state: ServiceState;
  detail: string;
  checked_at: string;
};
export type PublicIncident = {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  impact: "minor" | "major" | "critical";
  started_at: string;
  resolved_at: string | null;
  summary: string;
};
export type PublicStatus = {
  checked_at: string;
  overall: ServiceState;
  services: PublicService[];
  incidents: PublicIncident[];
};

type HealthInput = {
  runner: Awaited<ReturnType<typeof getDeepScanHealth>>;
  newestRegistryRefresh: string | null;
  scanFailureRate: number | null;
  notificationFailureRate: number | null;
  databaseReachable: boolean;
  incidents?: PublicIncident[];
  now?: Date;
};

export function evaluatePublicStatus(input: HealthInput): PublicStatus {
  const now = input.now ?? new Date();
  const checkedAt = now.toISOString();
  const refreshAge = input.newestRegistryRefresh
    ? now.getTime() - new Date(input.newestRegistryRefresh).getTime()
    : null;
  const services: PublicService[] = [
    service(
      "registry",
      "Extension registry",
      "Marketplace discovery and public release freshness.",
      refreshAge === null
        ? "unknown"
        : refreshAge <= 24 * 60 * 60_000
          ? "operational"
          : refreshAge <= 72 * 60 * 60_000
            ? "degraded"
            : "outage",
      input.newestRegistryRefresh
        ? `Last successful refresh ${formatAge(refreshAge!)} ago.`
        : "No successful refresh timestamp is available.",
      checkedAt,
    ),
    service(
      "deep-scan",
      "Deep Scan",
      "Queue acceptance and scanner-runner heartbeat.",
      input.runner.status === "ready"
        ? "operational"
        : input.runner.accepting_requests
          ? "degraded"
          : "outage",
      input.runner.status === "ready"
        ? "Runner heartbeat is current and requests are accepted."
        : input.runner.accepting_requests
          ? "Requests are accepted, but the latest runner heartbeat is delayed."
          : "Deep Scan is not currently configured to accept requests.",
      checkedAt,
    ),
    service(
      "analysis",
      "Analysis publication",
      "Canonical report completion during the last 24 hours.",
      rateState(input.scanFailureRate),
      rateDetail(input.scanFailureRate, "scan"),
      checkedAt,
    ),
    service(
      "notifications",
      "Notification delivery",
      "Team delivery outcomes during the last 24 hours.",
      rateState(input.notificationFailureRate),
      rateDetail(input.notificationFailureRate, "delivery"),
      checkedAt,
    ),
    service(
      "api",
      "Public API and data store",
      "Availability of the database used by public product routes.",
      input.databaseReachable ? "operational" : "outage",
      input.databaseReachable
        ? "The public status check reached the data store."
        : "The data store did not answer this status check.",
      checkedAt,
    ),
  ];
  const activeIncidents = (input.incidents ?? []).filter(
    (incident) => incident.status !== "resolved",
  );
  const incidentState: ServiceState = activeIncidents.some(
    (incident) => incident.impact === "major" || incident.impact === "critical",
  )
    ? "outage"
    : activeIncidents.length
      ? "degraded"
      : "operational";
  const states = services.map((item) => item.state);
  const overall: ServiceState =
    incidentState === "outage" || states.includes("outage")
      ? "outage"
      : incidentState === "degraded" || states.includes("degraded")
        ? "degraded"
        : states.includes("unknown")
          ? "unknown"
          : "operational";
  return {
    checked_at: checkedAt,
    overall,
    services,
    incidents: input.incidents ?? [],
  };
}

const cachedPublicStatus=unstable_cache(async()=>fetchPublicStatus(),["public-status-v1"],{revalidate:60,tags:["public-status"]});

export function getPublicStatus(): Promise<PublicStatus> { return cachedPublicStatus(); }

async function fetchPublicStatus(): Promise<PublicStatus> {
  const runner = await getDeepScanHealth();
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  try {
    const db = serviceDb();
    const [probe, refresh, scans, deliveries, incidents] = await Promise.all([
      db
        .from("registry_refreshes")
        .select("registry", { head: true, count: "exact" })
        .limit(1),
      db
        .from("registry_refreshes")
        .select("completed_at")
        .eq("status", "complete")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("scans")
        .select("analysis_status")
        .gte("scanned_at", since)
        .limit(2000),
      db
        .from("team_notification_deliveries")
        .select("status")
        .gte("created_at", since)
        .limit(2000),
      db
        .from("public_status_incidents")
        .select("id,title,status,impact,started_at,resolved_at,summary")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    const scanRows = scans.data ?? [];
    const deliveryRows = deliveries.data ?? [];
    return evaluatePublicStatus({
      runner,
      databaseReachable: !probe.error,
      newestRegistryRefresh: refresh.data?.completed_at
        ? String(refresh.data.completed_at)
        : null,
      scanFailureRate: scans.error
        ? null
        : ratio(
            scanRows.filter((row) => row.analysis_status === "failed").length,
            scanRows.length,
          ),
      notificationFailureRate: deliveries.error
        ? null
        : ratio(
            deliveryRows.filter((row) => row.status === "failed").length,
            deliveryRows.length,
          ),
      incidents: incidents.error ? [] : (incidents.data as PublicIncident[]),
    });
  } catch {
    return evaluatePublicStatus({
      runner,
      databaseReachable: false,
      newestRegistryRefresh: null,
      scanFailureRate: null,
      notificationFailureRate: null,
    });
  }
}

function service(
  id: string,
  name: string,
  description: string,
  state: ServiceState,
  detail: string,
  checked_at: string,
): PublicService {
  return { id, name, description, state, detail, checked_at };
}
function ratio(failures: number, total: number) {
  return total ? failures / total : null;
}
function rateState(rate: number | null): ServiceState {
  return rate === null
    ? "unknown"
    : rate >= 0.2
      ? "outage"
      : rate >= 0.05
        ? "degraded"
        : "operational";
}
function rateDetail(rate: number | null, noun: string) {
  return rate === null
    ? `No recent ${noun} sample is available.`
    : `${Math.round(rate * 100)}% ${noun} failure rate in the last 24 hours.`;
}
function formatAge(milliseconds: number) {
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} hr`;
}
