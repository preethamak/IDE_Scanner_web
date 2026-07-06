export type Verdict = "clean" | "review" | "suspicious" | "malicious";

export type InventoryExtension = {
  type: string;
  path: string;
  extension_id: string;
  name: string;
  display_name: string;
  publisher: string;
  version: string;
  description: string;
  icon_path?: string;
  modified_at: number | null;
};

export type InventoryResponse = {
  total_extensions: number;
  extensions: InventoryExtension[];
};

export type LocalScannerUnavailable = {
  error: string;
  code: "LOCAL_SCANNER_UNAVAILABLE";
  detail?: string;
};

export type FindingSummary = {
  finding_id: string;
  rule_id: string;
  category: string;
  severity: string;
  confidence: number;
  evidence_summary: string;
  file_refs: string[];
  recommendation: string;
};

export type ExtensionSummary = {
  instance_id: string;
  extension_id: string;
  name: string;
  publisher: string;
  version: string;
  source: string;
  install_path: string;
  severity: string;
  verdict: Verdict;
  verdict_reason: string;
  malware_score: number;
  risk_score: number;
  score_details?: {
    basis?: string;
    confidence?: string;
    components?: Record<string, number>;
    counts?: Record<string, number>;
    suppressors?: Array<{ id: string; reason: string; reduction?: number }>;
  };
  collector_details?: Record<string, unknown>;
  finding_count: number;
  top_findings: FindingSummary[];
};

export type PostureMetric = {
  id: string;
  status: "success" | "warning" | "failure" | "skipped";
  reason: string;
  evidence: Record<string, unknown>;
  client: string;
  category: string;
  score: number;
  weight: number;
  recommendation: string;
};

export type PostureSummary = {
  status: "success" | "warning" | "failure" | "skipped";
  score: number;
  max_metric_score: number;
  weighted_score: number;
  counts: Record<"failure" | "warning" | "success" | "skipped", number>;
  clients: string[];
  total_metrics: number;
  top_findings: Array<{
    id: string;
    client: string;
    status: string;
    score: number;
    reason: string;
    recommendation: string;
  }>;
};

export type ReportSummary = {
  summary: {
    total_extensions: number;
    max_malware_score: number;
    max_risk_score: number;
    posture_score?: number;
    posture_status?: string;
    by_verdict: Record<string, number>;
    by_severity: Record<string, number>;
  };
  human_summary: string[];
  posture_summary?: PostureSummary;
  posture?: PostureMetric[];
  version_deltas?: Array<{
    extension_id: string;
    previous_version?: string;
    current_version?: string;
    changes: Record<string, unknown>;
  }>;
  top_risk_extensions: ExtensionSummary[];
  action_counts: Record<Verdict, number>;
  finding_counts: {
    by_rule: Record<string, number>;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
  };
};

export type BenchmarkResult = {
  schema_version: string;
  total: number;
  correct: number;
  accuracy: number;
  false_positive: number;
  false_negative: number;
  malicious_recall: number;
  rows: Array<{
    extension_id: string;
    expected_verdict: Verdict;
    actual_verdict: Verdict | "missing";
    ok: boolean;
    reason: string;
    risk_score: number | null;
    malware_score: number | null;
    top_findings: string[];
  }>;
  scanner_summary: Record<string, unknown>;
};

export type ScanJobPublic = {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  createdAt: number;
  updatedAt: number;
  error: string | null;
  summary: ReportSummary | null;
  source?: "local" | "agent";
  agent?: {
    schema_version?: string;
    generated_at?: number;
    hostname?: string;
    platform?: string;
    platform_release?: string;
    machine?: string;
    python?: string;
  };
};
