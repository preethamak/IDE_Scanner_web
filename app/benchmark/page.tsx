import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Fingerprint, LockKeyhole, ScanLine } from "lucide-react";
import { getReproducibleBenchmark, immutableScanPath } from "@/lib/benchmarkEvidence";
import { outcomeMeta } from "@/lib/publicOutcome";
import { websiteBenchmark as benchmark } from "@/lib/websiteBenchmark";

export const dynamic = "force-dynamic";

export default async function BenchmarkPage() {
  const evidence = await getReproducibleBenchmark();
  return <main className="studyPage pageWrap">
    <section className="studyHero"><div><span className="kicker">Reproducibility gate · recalibration in progress</span><h1>Exact evidence,<br/>or no published result.</h1><p>The corpus contains 30 hash-pinned Marketplace artifacts. A result appears only when its immutable Deep Scan can be reopened with the exact artifact hash, scanner build, ruleset, and canonical report.</p></div><div className="studyStamp"><Fingerprint size={19}/><span>Frozen corpus</span><strong>{benchmark.corpus.artifacts} exact VSIX files</strong><span>Reproducible reports</span><strong>{evidence.published}/{evidence.rows.length}</strong></div></section>

    <section className="studyNumbers"><article><strong>{evidence.rows.length}</strong><span>hash-pinned artifacts</span></article><article><strong>{evidence.published}</strong><span>exact Deep Scans published</span></article><article><strong>{evidence.awaiting}</strong><span>results withheld pending rerun</span></article><article><strong>100%</strong><span>required coverage for publication</span></article></section>

    <section className="studyInterpretation"><div><span className="kicker">Trust contract</span><h2>The benchmark cannot drift away from its evidence.</h2></div><div><p>The previous run remains an internal engineering regression record. It is not presented as a public performance claim.</p><p>Every newly published row must reopen the same stored report used to produce its displayed outcome. A newer “latest” scan can never replace that evidence link.</p></div></section>

    <section className="studySection"><div className="resultHeader"><div><span className="kicker">Publication requirements</span><h2>Four checks before a row becomes evidence</h2></div><span>All required</span></div><div className="methodNote"><Gate icon={<Fingerprint/>} title="Artifact identity" detail="Extension, version, and SHA-256 match."/><Gate icon={<ScanLine/>} title="Complete analysis" detail="Required analyzers report 100% coverage."/><Gate icon={<LockKeyhole/>} title="Build identity" detail="Scanner build and ruleset are recorded."/><Gate icon={<CheckCircle2/>} title="Immutable report" detail="The displayed result opens by scan ID."/></div></section>

    <section className="studySection benchmarkEvidence"><div className="resultHeader"><div><span className="kicker">Frozen corpus</span><h2>Reproducible artifact reports</h2></div><span>No latest-scan links</span></div><p className="benchmarkLead">Rows awaiting a current benchmark-purpose scan show identity only. They do not inherit the previous result or a newer registry scan.</p><div className="benchmarkArtifactTable"><div className="benchmarkArtifactHead"><span>Exact artifact</span><span>Purpose</span><span>Reproducibility</span><span>Published outcome</span><span>Evidence</span></div>{evidence.rows.map((row) => {
      const path = immutableScanPath(row); const meta = row.scan ? outcomeMeta(row.scan.public_outcome, row.scan.decision) : null;
      return <article key={`${row.id}@${row.version}`}><div><strong>{row.id}</strong><code>@{row.version} · {row.sha256.slice(0, 16)}</code></div><span><b>{row.classification.replaceAll("-", " ")}</b><small>{row.split.replaceAll("-", " ")}</small></span><span><b className={`benchmarkDecision ${row.scan ? "allow" : "incomplete"}`}>{row.scan ? "reproducible" : "awaiting rerun"}</b><small>{row.scan ? `${row.scan.coverage_percent}% · ${row.scan.scanner_build.slice(0, 10)}` : "No public result"}</small></span><span><b>{meta?.short || "Withheld"}</b><small>{row.scan ? `rules ${row.scan.ruleset_version}` : "Pending exact Deep Scan"}</small></span><span>{path ? <Link href={path}>Open exact scan <ArrowUpRight/></Link> : <b>Not published</b>}<small>{row.scan ? `scan ${row.scan.id.slice(0, 8)}` : "Identity retained"}</small></span></article>;
    })}</div></section>

    <section className="studyCta"><div><span className="kicker">Evidence boundary</span><h2>Re-run first. Publish second.</h2><p>Catalog growth remains gated until the calibrated scanner produces complete, reproducible reports for the frozen corpus and the independent evaluation cohort.</p></div><div className="heroActions"><Link className="button buttonDark" href="/catalog">Open the catalog</Link><Link className="button buttonQuiet" href="/scoring">Read the outcome model</Link></div></section>
  </main>;
}

function Gate({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <article>{icon}<h3>{title}</h3><p>{detail}</p></article>; }
