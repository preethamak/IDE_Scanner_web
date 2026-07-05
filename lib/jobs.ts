import type { ReportSummary, ScanJobPublic } from "@/lib/types";

type ScanJob = ScanJobPublic & {
  report: unknown | null;
};

type JobStore = {
  scans: Map<string, ScanJob>;
};

const globalWithJobs = globalThis as typeof globalThis & {
  __IDE_SCANNER_WEB_JOBS__?: JobStore;
};

const store: JobStore = globalWithJobs.__IDE_SCANNER_WEB_JOBS__ || {
  scans: new Map<string, ScanJob>()
};

globalWithJobs.__IDE_SCANNER_WEB_JOBS__ = store;

export function createJob(): ScanJob {
  const now = Date.now();
  const job: ScanJob = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    error: null,
    summary: null,
    report: null
  };
  store.scans.set(job.id, job);
  return job;
}

export function getJob(id: string): ScanJob | null {
  return store.scans.get(id) || null;
}

export function updateJob(id: string, changes: Partial<ScanJob>): ScanJob | null {
  const job = getJob(id);
  if (!job) return null;
  Object.assign(job, changes, { updatedAt: Date.now() });
  return job;
}

export function setCompleteJob(id: string, summary: ReportSummary, report: unknown): ScanJob | null {
  return updateJob(id, {
    status: "complete",
    summary,
    report
  });
}

export function listJobs(): ScanJobPublic[] {
  return [...store.scans.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(publicJob);
}

export function latestCompleteJob(): ScanJob | null {
  return [...store.scans.values()]
    .filter((job) => job.status === "complete" && job.summary)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
}

export function latestCompleteReport(): unknown | null {
  return latestCompleteJob()?.report || null;
}

export function findExtensionInLatestReport(instanceId: string): { extension: unknown; summary: ReportSummary | null } | null {
  const job = latestCompleteJob();
  if (!job || !job.report || typeof job.report !== "object") return null;
  const report = job.report as { extensions?: unknown[] };
  const extension = (report.extensions || []).find((item) => {
    return Boolean(item && typeof item === "object" && "instance_id" in item && item.instance_id === instanceId);
  });
  if (!extension) return null;
  return { extension, summary: job.summary };
}

export function publicJob(job: ScanJob): ScanJobPublic {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error,
    summary: job.summary
  };
}
