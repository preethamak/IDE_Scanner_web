import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Database, ShieldCheck } from "lucide-react";

const cohort = [
  ["10", "legitimate calibration artifacts"], ["1", "known-malicious development regression"], ["50", "target frozen corpus"], ["0", "public efficacy rates claimed"],
];
const protocol = [
  ["Artifact identity", "Each admissible sample needs an exact VSIX, SHA-256, and public source reference."],
  ["Frozen policy", "Expected decisions are locked before acquisition for holdout samples; calibration samples remain excluded from efficacy claims."],
  ["Static-only run", "Artifacts are inspected in a no-network, read-only, unprivileged environment. Extension code is not executed."],
  ["Report boundary", "Precision, recall, and false-positive rates remain unpublished until the frozen holdout cohort is complete."],
];

export default function BenchmarkPage() {
  return <main className="studyPage pageWrap">
    <section className="studyHero"><div><span className="kicker">Validation protocol · curation in progress</span><h1>Show the limits before claiming the score.</h1><p>The current public benchmark is a calibration and regression corpus, not a completed efficacy study. IDE Scanner publishes its sample-admission rules and refuses to convert early results into accuracy marketing.</p></div><div className="studyStamp"><CalendarDays size={19}/><span>Policy frozen</span><strong>15 July 2026</strong><span>Scanner</span><strong>0.1.0 · static-only</strong></div></section>
    <section className="studyNumbers">{cohort.map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>
    <section className="studyInterpretation"><div><span className="kicker">Current conclusion</span><h2>Useful regression evidence, not an accuracy claim.</h2></div><div><p>The completed 10-artifact run contains powerful but legitimate extensions and is used to confirm that contextual capabilities do not become malware claims by default. One known-malicious artifact is retained as a development regression; it is not included in efficacy metrics.</p><p>The planned corpus adds independently labelled malicious holdouts. Until exact artifacts, labels, and frozen holdout decisions are complete, the product does not publish precision, recall, false-positive, false-negative, or protection totals.</p></div></section>
    <section className="studySection"><div className="resultHeader"><div><span className="kicker">Reproducible method</span><h2>How a sample becomes eligible</h2></div><span>Every boundary is part of the result</span></div><div className="methodNote">{protocol.map(([title, detail], index) => <div key={title}>{index === 0 ? <Database/> : index === 1 ? <ShieldCheck/> : index === 2 ? <BarChart3/> : <CalendarDays/>}<h3>{title}</h3><p>{detail}</p></div>)}</div></section>
    <section className="studySection recurringSection"><div className="sectionTitle"><span className="kicker">What this does not establish</span><h2>Current limitations are first-class evidence.</h2><p>The cohort is not representative of all Marketplace extensions. Development regressions and samples whose original artifact is unavailable are retained for research context, but excluded from public performance calculations.</p></div><div className="recurringList"><article><span>01</span><strong>No ecosystem-wide safety rate</strong><div><i style={{width:"0%"}}/></div><b>Not claimed</b></article><article><span>02</span><strong>No false-positive rate</strong><div><i style={{width:"0%"}}/></div><b>Not claimed</b></article><article><span>03</span><strong>No detection-rate marketing</strong><div><i style={{width:"0%"}}/></div><b>Not claimed</b></article></div></section>
    <section className="studyCta"><div><span className="kicker">Inspect the implementation</span><h2>Read the rules and the methodology beside the product.</h2></div><div className="heroActions"><Link className="button buttonDark" href="/metrics">Open rule reference <ArrowRight size={16}/></Link><Link className="button buttonQuiet" href="/scoring">Read methodology</Link></div></section>
  </main>;
}
