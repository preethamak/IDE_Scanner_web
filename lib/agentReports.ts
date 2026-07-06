import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReportSummary, ScanJobPublic } from "@/lib/types";

export type AgentMetadata = {
  schema_version?: string;
  generated_at?: number;
  hostname?: string;
  platform?: string;
  platform_release?: string;
  machine?: string;
  python?: string;
};

export type UploadedAgentReport = {
  id: string;
  createdAt: number;
  updatedAt: number;
  source: "agent";
  agent: AgentMetadata;
  summary: ReportSummary;
  report: unknown;
};

const reportsDir = process.env.VERCEL
  ? path.join("/tmp", ".ide-scanner-reports")
  : path.join(process.cwd(), ".ide-scanner-reports");

export async function saveAgentReport(payload: unknown): Promise<UploadedAgentReport> {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload must be an object");
  }
  const data = payload as { agent?: unknown; summary?: unknown; report?: unknown };
  if (!data.summary || typeof data.summary !== "object") {
    throw new Error("summary is required");
  }
  if (!data.report || typeof data.report !== "object") {
    throw new Error("report is required");
  }
  const now = Date.now();
  const agent = normalizeAgent(data.agent);
  const item: UploadedAgentReport = {
    id: `agent-${now}-${crypto.randomUUID()}`,
    createdAt: typeof agent.generated_at === "number" ? agent.generated_at : now,
    updatedAt: now,
    source: "agent",
    agent,
    summary: data.summary as ReportSummary,
    report: data.report
  };
  await mkdir(reportsDir, { recursive: true });
  await writeFile(reportPath(item.id), JSON.stringify(item, null, 2) + "\n", "utf-8");
  return item;
}

export async function listAgentReports(): Promise<UploadedAgentReport[]> {
  try {
    const entries = await readdir(reportsDir);
    const reports = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => readAgentReport(entry.slice(0, -5)))
    );
    return reports
      .filter((item): item is UploadedAgentReport => Boolean(item))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function readAgentReport(id: string): Promise<UploadedAgentReport | null> {
  if (!id.startsWith("agent-") || id.includes("/") || id.includes("\\")) {
    return null;
  }
  try {
    const raw = await readFile(reportPath(id), "utf-8");
    const data = JSON.parse(raw) as UploadedAgentReport;
    return data && data.id === id ? data : null;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function listAgentReportJobs(): Promise<ScanJobPublic[]> {
  return (await listAgentReports()).map(agentReportToJob);
}

export function agentReportToJob(item: UploadedAgentReport): ScanJobPublic {
  return {
    id: item.id,
    status: "complete",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    error: null,
    summary: item.summary,
    source: "agent",
    agent: item.agent
  };
}

function reportPath(id: string): string {
  return path.join(reportsDir, `${id}.json`);
}

function normalizeAgent(value: unknown): AgentMetadata {
  if (!value || typeof value !== "object") return {};
  const agent = value as Record<string, unknown>;
  return {
    schema_version: stringOrUndefined(agent.schema_version),
    generated_at: numberOrUndefined(agent.generated_at),
    hostname: stringOrUndefined(agent.hostname),
    platform: stringOrUndefined(agent.platform),
    platform_release: stringOrUndefined(agent.platform_release),
    machine: stringOrUndefined(agent.machine),
    python: stringOrUndefined(agent.python)
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
