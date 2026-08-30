"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ScanJobPublic } from "@/lib/types";
import { categoryForCapability } from "@/lib/permissionPassport";
import styles from "./diff.module.css";

type Delta = Record<string, unknown>;

const KNOWN_KEYS = new Set([
  "extension_id",
  "previous_version",
  "current_version",
  "changes",
  "artifact_changed",
  "analysis_changed",
  "baseline_changed",
  "added_capabilities",
  "removed_capabilities",
  "added_dependencies",
  "removed_dependencies",
  "added_findings",
  "removed_findings",
  "added_risky_artifacts",
  "removed_risky_artifacts",
]);

const OUTCOME_LABELS: Record<string, string> = {
  verdict: "Verdict",
  severity: "Severity",
  risk_score: "Risk score",
  malware_score: "Malware score",
};

export default function DiffPage() {
  const [latest, setLatest] = useState<ScanJobPublic | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/scans/history", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { scans?: ScanJobPublic[] }) => {
        setLatest((data.scans || []).find((scan) => scan.status === "complete" && scan.summary) || null);
      })
      .catch(() => setError("Scan history could not be loaded. Refresh to try again."));
  }, []);

  const deltas = (latest?.summary?.version_deltas || []) as Delta[];

  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Version intelligence</p>
          <h1>Diff</h1>
          <p className="heroCopy">Compare the newest scan against the previous completed report to reveal version, dependency, score, and artifact changes.</p>
        </div>
        <Link className="heroAction primaryAction" href="/analyze">Run compare scan</Link>
      </section>

      <section className="historyList benchmarkList">
        {deltas.map((delta) => (
          <DeltaCard delta={delta} key={String(delta.extension_id)} />
        ))}
        {error ? <p className="emptyCopy" role="alert">{error}</p> : null}
        {!latest && !error ? <p className="emptyCopy">Run at least one scan. A second scan will compare against the first completed report.</p> : null}
        {latest && deltas.length === 0 ? <p className="emptyCopy">No version, dependency, score, or artifact changes were found in the latest scan.</p> : null}
      </section>
    </main>
  );
}

function DeltaCard({ delta }: { delta: Delta }) {
  const previous = String(delta.previous_version || "unknown");
  const current = String(delta.current_version || "unknown");
  const tags = stringList(delta.changes);
  const outcomeChanges = tags.filter((tag) => tag in OUTCOME_LABELS).map((tag) => OUTCOME_LABELS[tag]);
  const extras = Object.entries(delta).filter(([key, value]) => !KNOWN_KEYS.has(key) && value !== undefined && value !== null);
  return (
    <article className={styles.deltaCard}>
      <header>
        <div className={styles.identity}>
          <span>Release changed</span>
          <strong>{String(delta.extension_id || "Unknown extension")}</strong>
        </div>
        <span className={styles.versions}>
          {previous} <ArrowRight /> {current}
        </span>
      </header>
      <div className={styles.changeRows}>
        <CapabilityRow label="Permissions added" ids={stringList(delta.added_capabilities)} added />
        <CapabilityRow label="Permissions removed" ids={stringList(delta.removed_capabilities)} />
        <ChipRow label="Dependencies added" items={stringList(delta.added_dependencies)} added />
        <ChipRow label="Dependencies removed" items={stringList(delta.removed_dependencies)} />
        <ChipRow label="New findings" items={stringList(delta.added_findings)} added />
        <ChipRow label="Resolved findings" items={stringList(delta.removed_findings)} />
        <ChipRow label="Risky files added" items={stringList(delta.added_risky_artifacts)} added />
        <ChipRow label="Risky files removed" items={stringList(delta.removed_risky_artifacts)} />
        {outcomeChanges.length ? (
          <div className={styles.changeRow}>
            <span>Analysis outcome</span>
            <div><p>{outcomeChanges.join(", ")} changed between the two analyzed releases.</p></div>
          </div>
        ) : null}
        {tags.includes("artifact_hash") ? (
          <div className={styles.changeRow}>
            <span>Artifact</span>
            <div><p>The packaged artifact contents changed (new package hash).</p></div>
          </div>
        ) : null}
        {tags.includes("version") && !delta.added_capabilities && !delta.removed_capabilities && !outcomeChanges.length ? (
          <div className={styles.changeRow}>
            <span>Version</span>
            <div><p>A new release was published without other detected analysis changes.</p></div>
          </div>
        ) : null}
        {extras.length ? (
          <div className={styles.changeRow}>
            <span>Other details</span>
            <div>
              <dl className={styles.kvList}>
                {extras.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replaceAll("_", " ")}</dt>
                    <dd>{readableValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CapabilityRow({ label, ids, added = false }: { label: string; ids: string[]; added?: boolean }) {
  if (!ids.length) return null;
  const categories = [...new Set(ids.map(categoryForCapability).filter(Boolean))].map(String);
  return (
    <div className={`${styles.changeRow} ${added ? styles.added : styles.removed}`}>
      <span>{label}</span>
      <div>
        {categories.length ? <p>Access categories: {categories.join(" · ")}</p> : null}
        <ul className={`${styles.chips} ${added ? styles.addedChips : ""}`}>
          {ids.map((id) => <li key={id}>{id}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ChipRow({ label, items, added = false }: { label: string; items: string[]; added?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={`${styles.changeRow} ${added ? styles.added : styles.removed}`}>
      <span>{label}</span>
      <div>
        <ul className={`${styles.chips} ${added ? styles.addedChips : ""}`}>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => readableValue(item));
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map(readableValue).join(", ") || "—";
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key.replaceAll("_", " ")}: ${readableValue(item)}`)
      .join(" · ") || "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
