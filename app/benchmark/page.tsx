import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Database, FileCheck2, FlaskConical, ShieldCheck } from "lucide-react";
import { getReproducibleBenchmark, immutableScanPath } from "@/lib/benchmarkEvidence";
import { websiteBenchmark as benchmark } from "@/lib/websiteBenchmark";

export const dynamic = "force-dynamic";

export default async function BenchmarkPage() {
  const evidence = await getReproducibleBenchmark();
  return <main className="studyPage pageWrap">
    <section className="studyHero"><div><span className="kicker">Frozen benchmark · exact evidence gate</span><h1>Regression evidence with its limits intact.</h1><p>30 exact Visual Studio Marketplace artifacts are frozen and hash-pinned. A public result appears only when its exact Deep Scan can be reopened with the matching artifact, scanner build, ruleset, and canonical report.</p></div><div className="studyStamp"><FileCheck2 size={19}/><span>Reproducible reports</span><strong>{evidence.published}/{evidence.rows.length}</strong><span>Artifacts</span><strong>{benchmark.corpus.artifacts} VSIX files</strong></div></section>

    <section className="studyNumbers"><article><strong>{evidence.rows.length}</strong><span>hash-pinned artifacts</span></article><article><strong>{evidence.published}</strong><span>exact Deep Scans published</span></article><article><strong>{evidence.awaiting}</strong><span>results withheld pending rerun</span></article><article><strong>100%</strong><span>required analyzer coverage</span></article></section>

    <section className="studyInterpretation"><div><span className="kicker">Correct interpretation</span><h2>Exact report evidence, not a detached score.</h2></div><div><p>The previous run remains an internal engineering regression record. It is not displayed as a current public scanner result.</p><p>Every published row must reopen the same stored report that produced its decision. A newer “latest” scan can never replace the evidence link.</p></div></section>

    <section className="studySection"><div className="resultHeader"><div><span className="kicker">Frozen corpus</span><h2>Identity remains visible while results are rerun</h2></div><span>Exact artifact boundary</span></div><div className="methodNote"><Metric icon={<Database/>} title="Corpus" value={`${evidence.rows.length} artifacts`} detail="Extension, version, and SHA-256 pinned"/><Metric icon={<ShieldCheck/>} title="Published" value={`${evidence.published} reports`} detail="Only exact benchmark-purpose scans"/><Metric icon={<FlaskConical/>} title="Withheld" value={`${evidence.awaiting} results`} detail="No evidence substitution"/></div></section>

    <section className="studySection"><div className="resultHeader"><div><span className="kicker">Publication gate</span><h2>Every visible result passes the same checks</h2></div><span>All checks required</span></div><div className="methodNote"><Metric icon={<Database/>} title="Artifact match" value="Exact" detail="Identity, version, and SHA-256 agree"/><Metric icon={<ShieldCheck/>} title="Coverage" value="100%" detail="Required analyzers completed"/><Metric icon={<FileCheck2/>} title="Report identity" value="Immutable" detail="Scanner build, ruleset, and scan ID recorded"/></div></section>

    <section className="studySection benchmarkEvidence"><div className="resultHeader"><div><span className="kicker">Artifact evidence</span><h2>Inspect all 30 frozen identities</h2></div><span>Exact SHA-256 shown</span></div><p className="benchmarkLead">Rows awaiting a current benchmark-purpose scan show identity only. They do not inherit the previous result or a newer registry scan.</p><div className="benchmarkArtifactTable"><div className="benchmarkArtifactHead"><span>Exact artifact</span><span>Cohort</span><span>Scan state</span><span>Severity</span><span>Scores</span></div>{evidence.rows.map((row) => { const path = immutableScanPath(row); return <article key={`${row.id}@${row.version}`}><div>{path ? <Link href={path}><strong>{row.id}</strong><ArrowUpRight/></Link> : <strong>{row.id}</strong>}<code>@{row.version} · {row.sha256.slice(0, 16)}</code></div><span><b>{row.classification.replaceAll("-", " ")}</b><small>{row.split.replaceAll("-", " ")}</small></span><span><b className={`benchmarkDecision ${row.scan?.decision || "incomplete"}`}>{row.scan?.decision || "awaiting rerun"}</b><small>{row.scan ? `${row.scan.coverage_percent}% coverage · scan ${row.scan.id.slice(0, 8)}` : "No public result"}</small></span><span><b>{row.scan ? (row.scan.severity === "INFO" ? "INFORMATIONAL" : row.scan.severity) : "WITHHELD"}</b><small>{row.scan ? `rules ${row.scan.ruleset_version}` : "Pending exact Deep Scan"}</small></span><span><b>{row.scan ? `M${row.scan.malware_score} · R${row.scan.risk_score}` : "Not published"}</b><small>{row.scan ? "diagnostic indexes" : "Identity retained"}</small></span></article>; })}</div></section>

    <section className="studySection recurringSection"><div className="sectionTitle"><span className="kicker">Publication boundary</span><h2>What the benchmark refuses to substitute.</h2><p>A result remains withheld until the current scanner produces a complete report for the exact frozen artifact.</p></div><div className="recurringList"><article><span>01</span><strong>No latest-version substitution</strong><div><i style={{ width: "0%" }}/></div><b>Required</b></article><article><span>02</span><strong>No artifact-hash mismatch</strong><div><i style={{ width: "0%" }}/></div><b>Required</b></article><article><span>03</span><strong>No incomplete analyzer coverage</strong><div><i style={{ width: "0%" }}/></div><b>Required</b></article></div></section>

    <section className="studyCta"><div><span className="kicker">Evidence boundary</span><h2>Re-run first. Publish second.</h2><p>The benchmark keeps its original visual structure while withholding every result that cannot reopen its exact canonical Deep Scan.</p></div><div className="heroActions"><Link className="button buttonDark" href="/scoring">Read the severity guide</Link><Link className="button buttonQuiet" href="/settings">Analysis boundaries</Link></div></section>
  </main>;
}

function Metric({ icon, title, value, detail }: { icon: ReactNode; title: string; value: string; detail: string }) {
  return <article>{icon}<h3>{title}</h3><p><strong>{value}</strong><br/>{detail}</p></article>;
}
