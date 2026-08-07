"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  GitCompareArrows,
} from "lucide-react";
import { categoryForCapability } from "@/lib/permissionPassport";
import styles from "./permissionDiffCard.module.css";

type VersionRow = {
  version?: unknown;
  latest_scan_id?: unknown;
  scan_state?: unknown;
};
type CompareResult = {
  comparable?: boolean;
  reason?: string;
  attribution?: { evidence_changes?: boolean; note?: string };
  changes?: {
    capabilities?: { added?: string[]; removed?: string[] };
    outcome?: {
      decision?: { from?: unknown; to?: unknown; changed?: boolean };
    };
  };
};

export default function PermissionDiffCard({
  extensionId,
  currentVersion,
  versions: suppliedVersions,
  compact = false,
}: {
  extensionId: string;
  currentVersion: string;
  versions?: VersionRow[];
  compact?: boolean;
}) {
  const [versions, setVersions] = useState<VersionRow[]>(
    suppliedVersions || [],
  );
  const candidates = useMemo(
    () =>
      versions.filter(
        (item) =>
          String(item.version || "") !== currentVersion &&
          (item.latest_scan_id || item.scan_state === "complete"),
      ),
    [currentVersion, versions],
  );
  const [baseline, setBaseline] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (suppliedVersions?.length) return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/extensions/${encodeURIComponent(extensionId)}/versions`)
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error("Versions unavailable");
          setVersions(Array.isArray(body.versions) ? body.versions : []);
        })
        .catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [extensionId, suppliedVersions]);
  useEffect(() => {
    if (baseline || !candidates[0]?.version) return;
    const timer = window.setTimeout(
      () => setBaseline(String(candidates[0].version)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [baseline, candidates]);
  useEffect(() => {
    if (!baseline) {
      if (!versions.length) return;
      const timer = window.setTimeout(() => setState("ready"), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    void fetch(
      `/api/extensions/${encodeURIComponent(extensionId)}/compare?from=${encodeURIComponent(baseline)}&to=${encodeURIComponent(currentVersion)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const body = (await response.json()) as CompareResult;
        if (!response.ok) throw new Error(body.reason || "Comparison failed");
        setResult(body);
        setState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState("error");
      });
    return () => controller.abort();
  }, [baseline, currentVersion, extensionId, versions.length]);

  const capabilities = result?.changes?.capabilities;
  const added = summarize(capabilities?.added || []);
  const removed = summarize(capabilities?.removed || []);
  return (
    <section className={`${styles.diff} ${compact ? styles.compact : ""}`}>
      <header>
        <div>
          <span>
            <GitCompareArrows /> Permission Diff
          </span>
          <h3>What changed since the reviewed release.</h3>
        </div>
        {candidates.length ? (
          <label>
            Compare from
            <select
              value={baseline}
              onChange={(event) => {
                setState("loading");
                setBaseline(event.target.value);
              }}
            >
              {candidates.map((item) => (
                <option value={String(item.version)} key={String(item.version)}>
                  @{String(item.version)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>
      {state === "loading" ? (
        <p className={styles.state}>Comparing exact analyzed releases…</p>
      ) : null}
      {state === "error" ? (
        <p className={styles.state}>
          <AlertTriangle /> Permission changes could not be loaded.
        </p>
      ) : null}
      {state === "ready" && !baseline ? (
        <p className={styles.state}>
          A Permission Diff appears after two releases complete analysis.
        </p>
      ) : null}
      {state === "ready" && result?.comparable === false ? (
        <p className={styles.state}>
          <AlertTriangle />{" "}
          {result.reason || "Both releases need completed analysis."}
        </p>
      ) : null}
      {state === "ready" && result?.comparable ? (
        <div className={styles.changeGrid}>
          <article className={added.length ? styles.changed : ""}>
            <span>
              {baseline} <ArrowRight /> {currentVersion}
            </span>
            <strong>
              {added.length
                ? `${added.length} access categories added`
                : "No new access category"}
            </strong>
            <p>
              {added.length
                ? added.join(" · ")
                : "The current analysis did not add a normalized access category."}
            </p>
          </article>
          <article>
            <span>Reduced authority</span>
            <strong>
              {removed.length
                ? `${removed.length} categories removed`
                : "No category removed"}
            </strong>
            <p>
              {removed.length
                ? removed.join(" · ")
                : "No previously observed category disappeared."}
            </p>
          </article>
          <article>
            <span>Evidence confidence</span>
            <strong>
              {result.attribution?.evidence_changes ? (
                <>
                  <Check /> Same scanner baseline
                </>
              ) : (
                "Mixed scanner baseline"
              )}
            </strong>
            <p>
              {result.attribution?.note ||
                "Artifact changes remain exact-version bound."}
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function summarize(capabilities: string[]) {
  const labels: Record<string, string> = {
    files: "Files",
    terminal: "Terminal",
    network: "Network",
    secrets: "Secrets",
    editor: "Editor",
    agents: "Agents & tools",
  };
  return [
    ...new Set(capabilities.map(categoryForCapability).filter(Boolean)),
  ].map((category) => labels[String(category)]);
}
