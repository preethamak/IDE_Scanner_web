"use client";

import { useEffect, useState } from "react";
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

export default function ComparePage() {
  const searchParams = useSearchParams();
  const queryExtension = searchParams.get("extension") || "";
  const queryFrom = searchParams.get("from") || "";
  const queryTo = searchParams.get("to") || "";
  const [extensionId, setExtensionId] = useState(queryExtension);
  const [product, setProduct] = useState<Product | null>(null);
  const [baseline, setBaseline] = useState(queryFrom);
  const [current, setCurrent] = useState(queryTo);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!queryExtension) return;
    setExtensionId(queryExtension);
    setLoading(true);
    setError("");
    void fetchProduct(queryExtension)
      .then((nextProduct) => {
        setProduct(nextProduct);
        const nextVersions = nextProduct.versions || [];
        const nextCurrent = chooseVersion(nextVersions, queryTo, 0);
        const nextBaseline = chooseVersion(nextVersions, queryFrom, 1, nextCurrent);
        setCurrent(nextCurrent);
        setBaseline(nextBaseline);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "The extension could not be loaded."))
      .finally(() => setLoading(false));
  }, [queryExtension, queryFrom, queryTo]);

  async function loadExtension(event: React.FormEvent) {
    event.preventDefault();
    const id = extensionId.trim();
    if (!id) {
      setError("Enter a publisher.extension ID to load its releases.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const nextProduct = await fetchProduct(id);
      const nextVersions = nextProduct.versions || [];
      const nextCurrent = chooseVersion(nextVersions, "", 0);
      setProduct(nextProduct);
      setCurrent(nextCurrent);
      setBaseline(chooseVersion(nextVersions, "", 1, nextCurrent));
    } catch (cause) {
      setProduct(null);
      setError(cause instanceof Error ? cause.message : "The extension could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function compareReleases(event: React.FormEvent) {
    event.preventDefault();
    if (!extensionId || !baseline || !current || baseline === current) {
      setError("Choose two different releases before comparing.");
      return;
    }
    setComparing(true);
    setError("");
    try {
      const response = await fetch(
        `/api/extensions/${encodeURIComponent(extensionId)}/compare?from=${encodeURIComponent(baseline)}&to=${encodeURIComponent(current)}`,
      );
      const body = (await response.json()) as CompareResult & { error?: string };
      if (!response.ok) throw new Error(String(body.error || "The release comparison could not be generated."));
      setResult(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The release comparison could not be generated.");
    } finally {
      setComparing(false);
    }
  }

  const versions = product?.versions || [];
  const name = product?.extension?.display_name || extensionId || "your extension";

  return (
    <main className="comparePage productComparePage">
      <header className="compareHero productCompareHero">
        <div>
          <span className="productEyebrow"><GitCompareArrows /> Release comparison</span>
          <h1>The release diff is where the decision becomes clear.</h1>
          <p>Choose one extension, set the reviewed baseline, and see exactly what the new artifact changed before it enters your editor or your team.</p>
        </div>
        <aside className="compareHeroNote">
          <span>GuardRails method</span>
          <strong>Exact artifacts in sequence</strong>
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
            <div><Search /><input name="extension" autoComplete="off" spellCheck={false} value={extensionId} onChange={(event) => setExtensionId(event.target.value)} placeholder="e.g. ms-python.python" /></div>
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
              <span>Reviewed baseline</span>
              <select value={baseline} onChange={(event) => setBaseline(event.target.value)}>
                <option value="">Choose a release</option>
                {versions.map((item) => <option key={`from-${item.version}`} value={String(item.version)}>{item.version} {item.is_latest ? "· latest" : ""}</option>)}
              </select>
            </label>
            <ArrowRight className="releaseArrow" aria-hidden="true" />
            <label>
              <span>Release to inspect</span>
              <select value={current} onChange={(event) => setCurrent(event.target.value)}>
                <option value="">Choose a release</option>
                {versions.map((item) => <option key={`to-${item.version}`} value={String(item.version)}>{item.version} {item.is_latest ? "· latest" : ""}</option>)}
              </select>
            </label>
            <button className="button buttonAccent" disabled={comparing}>{comparing ? <LoaderCircle className="spin" /> : "Compare releases"}</button>
          </form>
        ) : (
          <div className="compareEmpty productCompareEmpty"><GitCompareArrows /><strong>One package. Two moments. One defensible answer.</strong><p>Load an extension to select the releases that matter. A comparison is only shown when exact scan evidence exists for both sides.</p></div>
        )}
      </section>

      {error ? <p className="compareError" role="alert"><AlertTriangle /> {error}</p> : null}
      {result ? <ComparisonResult extensionId={extensionId} name={name} baseline={baseline} current={current} result={result} versions={versions} /> : null}
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
  const comparable = result.comparable !== false;
  return <section className="comparisonResult productComparisonResult" aria-labelledby="comparison-result-title">
    <div className="comparisonResultHeader">
      <div><span className="compareStep">03 / Read the change</span><h2 id="comparison-result-title">{name}<span> / release delta</span></h2><p>{baseline} is the reviewed baseline. {current} is the release you are deciding about.</p></div>
      <Link className="textAction" href={`/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(current)}`}>Open {current} summary <ArrowRight /></Link>
    </div>
    {!comparable ? <div className="comparisonUnavailable productComparisonUnavailable"><AlertTriangle /><div><strong>Not comparable yet</strong><p>{String(result.reason || "Both exact releases need completed analysis before a release diff can be generated.")}</p></div></div> : null}
    <div className="releasePair">
      <ReleaseCard label="Baseline" version={baseline} data={from} extensionId={extensionId} versions={versions} />
      <div className="releasePairArrow" aria-hidden="true"><ArrowRight /></div>
      <ReleaseCard label="Decision release" version={current} data={to} extensionId={extensionId} versions={versions} current />
    </div>
    {comparable ? <>
      <div className="deltaStrip">
        <Delta label="Decision" value={deltaValue(outcome.decision)} tone={Boolean(object(outcome.decision).changed) ? "attention" : "quiet"} />
        <Delta label="Severity" value={deltaValue(outcome.severity)} tone={Boolean(object(outcome.severity).changed) ? "attention" : "quiet"} />
        <Delta label="Coverage" value={deltaValue(outcome.coverage)} tone="quiet" />
        <Delta label="Evidence basis" value={result.attribution?.evidence_changes ? "Same scanner baseline" : "Mixed scanner baseline"} tone={result.attribution?.evidence_changes ? "good" : "attention"} />
      </div>
      <div className="deltaColumns">
        <DeltaGroup title="Access surface" added={array(capabilities.added)} removed={array(capabilities.removed)} empty="No normalized capability changed." />
        <DeltaGroup title="Findings" added={array(findings.added)} removed={array(findings.removed)} empty="No finding delta was recorded." />
        <DeltaGroup title="Package movement" added={[...array(dependencies.added), ...array(files.added)]} removed={[...array(dependencies.removed), ...array(files.removed)]} empty="No dependency or file delta was recorded." />
      </div>
      <p className="comparisonFootnote">{String(result.attribution?.note || "File, dependency, finding, and capability changes are bounded to these exact artifacts.")}</p>
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

function DeltaGroup({ title, added, removed, empty }: { title: string; added: unknown[]; removed: unknown[]; empty: string }) {
  return <article className="deltaGroup"><header><strong>{title}</strong><span>{added.length + removed.length} changes</span></header>{added.length || removed.length ? <div className="deltaItems">{added.slice(0, 8).map((item, index) => <span className="added" key={`added-${index}`}><b>+</b>{itemLabel(item)}</span>)}{removed.slice(0, 8).map((item, index) => <span className="removed" key={`removed-${index}`}><b>−</b>{itemLabel(item)}</span>)}</div> : <p>{empty}</p>}</article>;
}

async function fetchProduct(id: string): Promise<Product> {
  const response = await fetch(`/api/extensions/${encodeURIComponent(id.trim())}`);
  const body = (await response.json()) as Product & { error?: string };
  if (!response.ok) throw new Error(String(body.error || "Extension not found in the catalog."));
  return body;
}

function chooseVersion(versions: Version[], preferred: string, index: number, exclude = "") {
  if (preferred && versions.some((item) => String(item.version) === preferred && preferred !== exclude)) return preferred;
  const options = versions.map((item) => String(item.version)).filter((item) => item && item !== exclude);
  return options[index] || options[0] || "";
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function itemLabel(value: unknown) { const item = object(value); return String(item.summary || item.rule_id || item.path || item.name || value); }
function deltaValue(value: unknown) { const item = object(value); return item.changed ? `${String(item.from || "unknown")} → ${String(item.to || "unknown")}` : String(item.to || item.from || "No change"); }
