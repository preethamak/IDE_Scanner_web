"use client";

import type { BenchmarkBundle, BenchmarkBundleRow, ExtensionDetail, ImportedReportBundle, ReportMetadata, RuleMetadata, ScannerBundleSummary } from "@/lib/types";

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const STORE_KEY = "ide-scanner.importedReports.v1";
const BENCHMARK_STORE_KEY = "ide-scanner.importedBenchmarks.v1";

export async function parseReportBundle(file: File): Promise<ImportedReportBundle> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jsonEntries = await readJsonEntries(bytes);

  const metadata = requireObject<ReportMetadata>(jsonEntries.get("metadata.json"), "metadata.json");
  const summary = requireObject<ScannerBundleSummary>(jsonEntries.get("summary.json"), "summary.json");
  const leaderboard = requireObject<{ extensions: ImportedReportBundle["leaderboard"]["extensions"] }>(jsonEntries.get("leaderboard.json"), "leaderboard.json");
  const posture = objectOrEmpty(jsonEntries.get("posture.json"));
  const rules = requireObject<{ ruleset_version?: string; rules: RuleMetadata[] }>(jsonEntries.get("rules.json"), "rules.json");
  const details: Record<string, ExtensionDetail> = {};
  for (const [name, value] of jsonEntries) {
    if (name.startsWith("extensions/")) {
      details[name] = requireObject<ExtensionDetail>(value, name);
    }
  }

  return {
    id: metadata.scan_id || crypto.randomUUID(),
    name: file.name,
    importedAt: Date.now(),
    metadata,
    summary,
    leaderboard,
    posture,
    rules,
    details,
  };
}

export async function parseBenchmarkBundle(file: File): Promise<BenchmarkBundle> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jsonEntries = await readJsonEntries(bytes);
  const metadata = requireObject<BenchmarkBundle["metadata"]>(jsonEntries.get("metadata.json"), "metadata.json");
  const leaderboard = requireObject<{ extensions: BenchmarkBundleRow[] }>(jsonEntries.get("leaderboard.json"), "leaderboard.json");
  const benchmark_summary = requireObject<BenchmarkBundle["benchmark_summary"]>(jsonEntries.get("benchmark_summary.json"), "benchmark_summary.json");
  const rule_coverage = requireObject<BenchmarkBundle["rule_coverage"]>(jsonEntries.get("rule_coverage.json"), "rule_coverage.json");
  const comparisons = objectOrEmpty(jsonEntries.get("comparisons.json"));
  const extensions: Record<string, BenchmarkBundleRow> = {};
  for (const [name, value] of jsonEntries) {
    if (name.startsWith("extensions/")) {
      const row = requireObject<BenchmarkBundleRow>(value, name);
      extensions[row.extension_id || name] = row;
    }
  }
  return {
    id: metadata.benchmark_id || crypto.randomUUID(),
    name: file.name,
    importedAt: Date.now(),
    metadata,
    leaderboard,
    benchmark_summary,
    rule_coverage,
    comparisons,
    extensions,
  };
}

export function saveImportedReport(bundle: ImportedReportBundle): void {
  const reports = listImportedReports().filter((item) => item.id !== bundle.id);
  reports.unshift(bundle);
  localStorage.setItem(STORE_KEY, JSON.stringify(reports.slice(0, 20)));
}

export function listImportedReports(): ImportedReportBundle[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isImportedReportBundle) : [];
  } catch {
    return [];
  }
}

export function getImportedReport(id: string): ImportedReportBundle | null {
  return listImportedReports().find((item) => item.id === id) || null;
}

export function deleteImportedReport(id: string): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(listImportedReports().filter((item) => item.id !== id)));
}

export function saveImportedBenchmark(bundle: BenchmarkBundle): void {
  const benchmarks = listImportedBenchmarks().filter((item) => item.id !== bundle.id);
  benchmarks.unshift(bundle);
  localStorage.setItem(BENCHMARK_STORE_KEY, JSON.stringify(benchmarks.slice(0, 20)));
}

export function listImportedBenchmarks(): BenchmarkBundle[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(BENCHMARK_STORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isBenchmarkBundle) : [];
  } catch {
    return [];
  }
}

export function getImportedBenchmark(id: string): BenchmarkBundle | null {
  return listImportedBenchmarks().find((item) => item.id === id) || null;
}

export function deleteImportedBenchmark(id: string): void {
  localStorage.setItem(BENCHMARK_STORE_KEY, JSON.stringify(listImportedBenchmarks().filter((item) => item.id !== id)));
}

async function readJsonEntries(bytes: Uint8Array): Promise<Map<string, unknown>> {
  const entries = readCentralDirectory(bytes);
  const jsonEntries = new Map<string, unknown>();
  for (const entry of entries) {
    if (!entry.name.endsWith(".json")) continue;
    const raw = await readEntry(bytes, entry);
    jsonEntries.set(entry.name, JSON.parse(new TextDecoder().decode(raw)));
  }
  return jsonEntries;
}

function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const totalEntries = view.getUint16(eocd + 10, true);
  const centralDirectoryOffset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory.");
    }
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = bytes.slice(offset + 46, offset + 46 + fileNameLength);
    const name = new TextDecoder().decode(nameBytes);
    entries.push({ name, compression, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(view: DataView): number {
  const min = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("Could not find ZIP end-of-central-directory record.");
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entry.name}.`);
  }
  const fileNameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.compression === 0) return compressed;
  if (entry.compression !== 8) {
    throw new Error(`Unsupported ZIP compression method ${entry.compression} for ${entry.name}.`);
  }
  return inflateRaw(compressed, entry.uncompressedSize);
}

async function inflateRaw(bytes: Uint8Array, expectedSize: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress ZIP report bundles.");
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  const buffer = await new Response(stream).arrayBuffer();
  const inflated = new Uint8Array(buffer);
  if (expectedSize && inflated.byteLength !== expectedSize) {
    throw new Error("ZIP entry decompressed to an unexpected size.");
  }
  return inflated;
}

function requireObject<T>(value: unknown, name: string): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} is missing or invalid.`);
  }
  return value as T;
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isImportedReportBundle(value: unknown): value is ImportedReportBundle {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "metadata" in value &&
    "summary" in value &&
    "leaderboard" in value &&
    "details" in value
  );
}

function isBenchmarkBundle(value: unknown): value is BenchmarkBundle {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "metadata" in value &&
    "leaderboard" in value &&
    "benchmark_summary" in value &&
    "rule_coverage" in value
  );
}
