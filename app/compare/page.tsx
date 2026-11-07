"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  GitCompareArrows,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { chooseBaselineVersion } from "./versionSelection";

type Version = {
  version?: string;
  is_latest?: boolean;
  scan_state?: string;
  decision?: string | null;
  latest_scan_id?: string | null;
  coverage_percent?: number | null;
};

type Product = {
  extension?: {
    id?: string;
    display_name?: string;
    publisher?: string;
    description?: string;
    registry?: string;
    publisher_verified?: boolean;
  };
  versions?: Version[];
};

type CompareResult = {
  comparable?: boolean;
  reason?: string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
  changes?: Record<string, unknown>;
};

type CompletedComparison = {
  extensionId: string;
  name: string;
  baseline: string;
  current: string;
  versions: Version[];
  evidence: CompareResult;
};

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareLoadingState />}>
      <CompareWorkspace />
    </Suspense>
  );
}

function CompareLoadingState() {
  return (
    <main className="comparePage productComparePage" aria-busy="true">
      <section className="compareWorkspace compareLoadingState">
        <LoaderCircle className="spin" aria-label="Loading release comparison" />
        <strong>Loading the release comparison workspace…</strong>
      </section>
    </main>
  );
}

function CompareWorkspace() {
  const searchParams = useSearchParams();
  const queryExtension = searchParams.get("extension") || "";
  const queryFrom = searchParams.get("from") || "";
  const queryTo = searchParams.get("to") || "";
  const queryFromScanId = searchParams.get("fromScanId") || "";
  const queryToScanId = searchParams.get("toScanId") || "";
  const [extensionId, setExtensionId] = useState(queryExtension);
  const [product, setProduct] = useState<Product | null>(null);
  const [baseline, setBaseline] = useState(queryFrom);
  const [current, setCurrent] = useState(queryTo);
  const [result, setResult] = useState<CompletedComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  // Invalidate immediately on edits, not after the next request completes.
  // A completed comparison also retains its own immutable display identity.
  const invalidateResult = useCallback(() => {
    requestSequence.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setResult(null);
    setLoading(false);
    setComparing(false);
    setError("");
  }, []);

  const loadProduct = useCallback(async (id: string, preferredFrom = "", preferredTo = "") => {
    invalidateResult();
    const sequence = requestSequence.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setProduct(null);
    setBaseline("");
    setCurrent("");
    try {
      const nextProduct = await fetchProduct(id, controller.signal);
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      const nextVersions = nextProduct.versions || [];
      const nextCurrent = chooseVersion(nextVersions, preferredTo, 0);
      setExtensionId(id);
      setProduct(nextProduct);
      setCurrent(nextCurrent);
      setBaseline(chooseBaselineVersion(nextVersions, preferredFrom, nextCurrent));
    } catch (cause) {
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "The extension could not be loaded.");
    } finally {
      if (sequence === requestSequence.current && !controller.signal.aborted) setLoading(false);
    }
  }, [invalidateResult]);

  useEffect(() => {
    if (!queryExtension) return;
    const timer = window.setTimeout(() => void loadProduct(queryExtension, queryFrom, queryTo), 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
      activeRequest.current?.abort();
    };
  }, [queryExtension, queryFrom, queryTo, queryFromScanId, queryToScanId, loadProduct]);

  async function loadExtension(event: React.FormEvent) {
    event.preventDefault();
    const id = extensionId.trim();
    if (!id) {
      setError("Enter a publisher.extension ID to load its releases.");
      return;
    }
    await loadProduct(id);
  }

  async function compareReleases(event: React.FormEvent) {
    event.preventDefault();
    if (!extensionId || !baseline || !current || baseline === current) {
      setError("Choose two different releases before comparing.");
      return;
    }
    invalidateResult();
    const sequence = requestSequence.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    const identity = { extensionId, name: product?.extension?.display_name || extensionId, baseline, current, versions: product?.versions || [] };
    setComparing(true);
    try {
      const query = new URLSearchParams({ from: baseline, to: current });
      if (extensionId.trim().toLowerCase() === queryExtension.trim().toLowerCase()) {
        if (queryFromScanId && baseline === queryFrom) query.set("fromScanId", queryFromScanId);
        if (queryToScanId && current === queryTo) query.set("toScanId", queryToScanId);
      }
      const response = await fetch(
        `/api/extensions/${encodeURIComponent(extensionId)}/compare?${query}`,
        { signal: controller.signal },
      );
      const body = (await response.json()) as CompareResult & { error?: string };
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      if (!response.ok) throw new Error(String(body.error || "The release comparison could not be generated."));
      setResult({ ...identity, evidence: body });
    } catch (cause) {
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "The release comparison could not be generated.");
    } finally {
      if (sequence === requestSequence.current && !controller.signal.aborted) setComparing(false);
    }
  }

  const versions = product?.versions || [];
  const name = product?.extension?.display_name || extensionId || "your extension";

  return (
    <main className="comparePage productComparePage">
      <header className="compareHero productCompareHero">
        <div>
          <span className="productEyebrow"><GitCompareArrows /> Release comparison</span>
          <h1>What changed in this extension update?</h1>
          <p>Compare the package you have with the version you are considering. Inspect changed files, dependencies, findings, and capabilities before recording a team decision.</p>
        </div>
        <aside className="compareHeroNote">
          <span>GuardRails method</span>
          <strong>Review what changed</strong>
          <p>Findings and capabilities are only attributed when both releases have completed evidence from the same scanner baseline.</p>
        </aside>
      </header>

      <section className="compareWorkspace" aria-labelledby="compare-workspace-title">
        <div className="compareWorkspaceHeader">
          <div>
            <span className="compareStep">01 / Load a package</span>
            <h2 id="compare-workspace-title">Start with the extension you are reviewing.</h2>
          </div>
          {product?.extension ? <span className="compareLoaded"><Check /> Package loaded</span> : null}
        </div>
        <form className="compareLookup" onSubmit={loadExtension}>
          <label>
            <span>Publisher.extension ID</span>
            <div><Search /><input name="extension" autoComplete="off" spellCheck={false} value={extensionId} onChange={(event) => { invalidateResult(); setExtensionId(event.target.value); setProduct(null); setBaseline(""); setCurrent(""); }} placeholder="e.g. ms-python.python" /></div>
          </label>
          <button className="button buttonDark" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : "Load releases"}</button>
        </form>

        {product ? (
          <form className="releaseSelectors" onSubmit={compareReleases}>
            <div className="releaseSelectorIntro">
              <span className="compareStep">02 / Set the question</span>
              <strong>{name}</strong>
              <small>{product.extension?.publisher || "Publisher not reported"} · {product.extension?.registry === "openvsx" ? "Open VSX" : "VS Marketplace"}</small>
            </div>
            <label>
              <span>Comparison baseline</span>
              <select value={baseline} onChange={(event) => { invalidateResult(); setBaseline(event.target.value); }}>
                <option value="">Choose a release</option>
                {versions.map((item) => <option key={`from-${item.version}`} value={String(item.version)}>{item.version} {item.is_latest ? "· latest" : ""}</option>)}
              </select>
            </label>
            <ArrowRight className="releaseArrow" aria-hidden="true" />
            <label>
              <span>Release to inspect</span>
              <select value={current} onChange={(event) => { invalidateResult(); setCurrent(event.target.value); }}>
                <option value="">Choose a release</option>
                {versions.map((item) => <option key={`to-${item.version}`} value={String(item.version)}>{item.version} {item.is_latest ? "· latest" : ""}</option>)}
              </select>
            </label>
            <button className="button buttonAccent" disabled={comparing || !baseline || !current || baseline === current}>{comparing ? <LoaderCircle className="spin" /> : "Compare releases"}</button>
          </form>
        ) : (
          <div className="compareEmpty productCompareEmpty"><GitCompareArrows /><strong>Choose two releases to compare.</strong><p>Load an extension to select a baseline and target version. Both need completed scan evidence before changes can be shown.</p></div>
        )}
      </section>

      {error ? <p className="compareError" role="alert"><AlertTriangle /> {error}</p> : null}
      {result ? <ComparisonResult extensionId={result.extensionId} name={result.name} baseline={result.baseline} current={result.current} result={result.evidence} versions={result.versions} /> : null}
    </main>
  );
}

function ComparisonResult({ extensionId, name, baseline, current, result, versions }: { extensionId: string; name: string; baseline: string; current: string; result: CompareResult; versions: Version[] }) {
  const from = result.from || {};
  const to = result.to || {};
  const changes = result.changes || {};
  const outcome = object(changes.outcome);
  const capabilities = object(changes.capabilities);
  const findings = object(changes.findings);
  const dependencies = object(changes.dependencies);
  const files = object(changes.files);
  const comparable = result.comparable === true;
  return <section className="comparisonResult productComparisonResult" aria-labelledby="comparison-result-title">
    <div className="comparisonResultHeader">
      <div><span className="compareStep">03 / Read the change</span><h2 id="comparison-result-title">{name}<span> / release delta</span></h2><p>Comparing {baseline} with {current}. This comparison does not record an approval.</p></div>
      <Link className="textAction" href={`/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(current)}`}>Open {current} summary <ArrowRight /></Link>
    </div>
    {!comparable ? <div className="comparisonUnavailable productComparisonUnavailable"><AlertTriangle /><div><strong>Not comparable yet</strong><p>{String(result.reason || "Both exact releases need completed analysis before a release diff can be generated.")}</p></div></div> : null}
    <div className="releasePair">
      <ReleaseCard label="Baseline" version={baseline} data={from} extensionId={extensionId} versions={versions} />
      <div className="releasePairArrow" aria-hidden="true"><ArrowRight /></div>
      <ReleaseCard label="Decision release" version={current} data={to} extensionId={extensionId} versions={versions} current />
    </div>
    {comparable ? <>
      {!result.attribution?.evidence_changes ? <p className="comparisonFootnote">Scanner provenance is missing or differs. Finding and capability differences are review context; they cannot be attributed to this update.</p> : null}
      <div className="deltaStrip">
        <Delta label="Decision" value={deltaValue(outcome.decision)} tone={Boolean(object(outcome.decision).changed) ? "attention" : "quiet"} />
        <Delta label="Severity" value={deltaValue(outcome.severity)} tone={Boolean(object(outcome.severity).changed) ? "attention" : "quiet"} />
        <Delta label="Coverage" value={deltaValue(outcome.coverage)} tone="quiet" />
        <Delta label="Evidence basis" value={result.attribution?.evidence_changes ? "Same scanner baseline" : result.attribution?.provenance_known === false ? "Scanner provenance unavailable" : "Mixed scanner baseline"} tone={result.attribution?.evidence_changes ? "good" : "attention"} />
      </div>
      <div className="deltaColumns">
        <DeltaGroup title="Observed access categories" added={array(capabilities.added)} removed={array(capabilities.removed)} empty="Both scans report the same normalized access categories." />
        <DeltaGroup title="Findings" added={array(findings.added)} removed={array(findings.removed)} total={changeCount(findings)} empty="No finding delta was recorded." />
        <DeltaGroup title="Package movement" added={[...array(dependencies.added), ...array(files.added)]} removed={[...array(dependencies.removed), ...array(files.removed)]} changed={array(files.changed)} total={changeCount(dependencies) + changeCount(files)} empty="No dependency or file delta was recorded." />
      </div>
      <p className="comparisonFootnote">{String(result.attribution?.note || "Changes shown are limited to the two packages analyzed.")}</p>
    </> : null}
  </section>;
}

function ReleaseCard({ label, version, data, extensionId, versions, current = false }: { label: string; version: string; data: Record<string, unknown>; extensionId: string; versions: Version[]; current?: boolean }) {
  const row = versions.find((item) => String(item.version) === version);
  const scanId = String(data.scan_id || row?.latest_scan_id || "");
  const href = scanId ? `/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(scanId)}` : `/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}`;
  const decision = String(data.decision || row?.decision || "not scanned").replaceAll("_", " ");
  return <article className={`releaseCard ${current ? "isCurrent" : ""}`}><span>{label}</span><strong>{version}</strong><small>{decision.toUpperCase()}</small><dl><div><dt>Coverage</dt><dd>{data.coverage_percent == null ? "—" : `${String(data.coverage_percent)}%`}</dd></div><div><dt>Findings</dt><dd>{data.findings == null ? "—" : String(data.findings)}</dd></div><div><dt>Files</dt><dd>{data.files == null ? "—" : String(data.files)}</dd></div></dl><Link href={href}>Open exact evidence <ArrowRight /></Link></article>;
}

function Delta({ label, value, tone }: { label: string; value: string; tone: "quiet" | "attention" | "good" }) { return <article className={`delta ${tone}`}><span>{label}</span><strong>{value}</strong></article>; }

function DeltaGroup({ title, added, removed, changed = [], total, empty }: { title: string; added: unknown[]; removed: unknown[]; changed?: unknown[]; total?: number; empty: string }) {
  const [expanded, setExpanded] = useState(false);
  const entries = [...added.map((item) => ({ item, kind: "added", symbol: "+" })), ...removed.map((item) => ({ item, kind: "removed", symbol: "−" })), ...changed.map((item) => ({ item, kind: "changed", symbol: "~" }))];
  const count = total ?? entries.length;
  const visible = expanded ? entries : entries.slice(0, 8);
  return <article className="deltaGroup"><header><strong>{title}</strong><span>{count} changes</span></header>{entries.length ? <><div className="deltaItems">{visible.map(({ item, kind, symbol }, index) => <span className={kind} key={`${kind}-${index}`}><b aria-label={kind}>{symbol}</b>{itemLabel(item)}</span>)}</div>{entries.length > 8 ? <button type="button" className="textAction" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Show fewer changes" : `Show all ${entries.length} available changes`}</button> : null}{count > entries.length ? <p>{entries.length} of {count} changes included. Open the exact reports for the full evidence.</p> : null}</> : <p>{empty}</p>}</article>;
}

function changeCount(group: Record<string, unknown>) { return ["added", "removed", "changed"].reduce((total, key) => total + (typeof group[`total_${key}`] === "number" ? group[`total_${key}`] as number : array(group[key]).length), 0); }

async function fetchProduct(id: string, signal?: AbortSignal): Promise<Product> {
  const response = await fetch(`/api/extensions/${encodeURIComponent(id.trim())}`, { signal });
  const body = (await response.json()) as Product & { error?: string };
  if (!response.ok) throw new Error(String(body.error || "Extension not found in the catalog."));
  return body;
}

function chooseVersion(versions: Version[], preferred: string, index: number, exclude = "") {
  if (preferred) return versions.some((item) => String(item.version) === preferred && preferred !== exclude) ? preferred : "";
  const options = versions.map((item) => String(item.version)).filter((item) => item && item !== exclude);
  return options[index] || options[0] || "";
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function itemLabel(value: unknown) { const item = object(value); return String(item.summary || item.rule_id || item.path || item.name || value); }
function deltaValue(value: unknown) { const item = object(value); const display = (part: unknown) => part == null || part === "" ? "unknown" : String(part); return item.changed ? `${display(item.from)} → ${display(item.to)}` : item.to != null ? display(item.to) : item.from != null ? display(item.from) : "No change"; }
