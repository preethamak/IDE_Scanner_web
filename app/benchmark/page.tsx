import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Database, ShieldCheck } from "lucide-react";

const extensions = [
  ["mathematic.vscode-pdf", "0.1.11", "59", "Workflow permissions and destructive file patterns"],
  ["selfagency.opilot", "1.8.2", "59", "Agent tooling, startup activation, and workflow posture"],
  ["ms-toolsai.jupyter", "2025.9.1", "58", "Lifecycle scripts and powerful IDE contributions"],
  ["ms-python.python", "2026.4.0", "58", "Sensitive activation and agent-facing capabilities"],
  ["ms-vscode-remote.remote-containers", "0.463.0", "54", "Lifecycle scripts and mutable dependency sources"],
  ["xyc.vscode-mdx-preview", "0.3.3", "53", "Process execution, network access, and lifecycle scripts"],
];

const recurring = [
  ["Dynamic code loading", 115], ["Sensitive activation", 114], ["Missing packaged security policy", 101], ["Process execution", 69], ["Obfuscation indicators", 68], ["Startup activation", 42], ["Filesystem access", 39], ["Lifecycle scripts", 35]
];

export default function BenchmarkPage() {
  return <main className="studyPage pageWrap">
    <section className="studyHero"><div><span className="kicker">Ecosystem scan · historical cohort 01</span><h1>What we found across 148 extension artifacts.</h1><p>This is an observational ecosystem scan: IDE Scanner analyzed a defined public extension cohort and classified the behavior it found. It demonstrates scanner output at scale; it is not a labeled accuracy benchmark.</p></div><div className="studyStamp"><CalendarDays size={19}/><span>Scanned</span><strong>03 July 2026</strong><span>Ruleset</span><strong>Pre-2.1 historical run</strong></div></section>

    <section className="studyNumbers"><article><strong>148</strong><span>artifact versions analyzed</span></article><article><strong>85</strong><span>required capability review</span></article><article><strong>63</strong><span>had contextual evidence only</span></article><article><strong>0</strong><span>confirmed malware decisions</span></article></section>

    <section className="studyInterpretation"><div><span className="kicker">The result in plain language</span><h2>Powerful does not mean malicious.</h2></div><div><p>More than half the cohort exposed capabilities that deserved review: install scripts, process execution, broad activation, dynamic loading, or agent-facing contributions. The run found <strong>no confirmed malicious intelligence</strong>.</p><p>That does not mean 85 extensions were unsafe. It means their access should be understood before approval. This is exactly why IDE Scanner separates <strong>capability review</strong> from a malware decision.</p></div></section>

    <section className="studySection"><div className="resultHeader"><div><span className="kicker">Highest review pressure</span><h2>Artifacts requiring the most context</h2></div><span>Risk index is prioritization, not probability</span></div><div className="studyTable"><div className="studyTableHead"><span>Extension artifact</span><span>Risk</span><span>Why it surfaced</span><span>Classification</span></div>{extensions.map(([id, version, risk, reason]) => <article key={`${id}-${version}`}><div><strong>{id}</strong><code>@{version}</code></div><b>{risk}</b><p>{reason}</p><span className="decision review">REVIEW</span></article>)}</div></section>

    <section className="studySection recurringSection"><div className="sectionTitle"><span className="kicker">Recurring signals</span><h2>Capabilities seen across the cohort.</h2><p>Counts are finding occurrences, not unique malicious extensions. Generated code and repeated file-level matches can contribute more than once.</p></div><div className="recurringList">{recurring.map(([label, count], index) => <article key={String(label)}><span>0{index + 1}</span><strong>{label}</strong><div><i style={{ width: `${Math.round(Number(count) / 1.15)}%` }}/></div><b>{count}</b></article>)}</div></section>

    <section className="methodNote"><div><Database/><h3>Dataset boundary</h3><p>148 artifact versions collected for scanner evaluation across language, preview, container, AI, data, and developer-tool categories. It is not a statistically representative sample of the entire Marketplace.</p></div><div><BarChart3/><h3>What this proves</h3><p>The scanner can classify real extension capability at cohort scale and preserve evidence. It does not prove detection accuracy without labeled ground truth.</p></div><div><ShieldCheck/><h3>Formal validation</h3><p>Precision, recall, F1, specificity, and rule coverage belong to labeled malicious/benign benchmark datasets and are maintained separately from ecosystem observations.</p></div></section>

    <section className="studyCta"><div><span className="kicker">Inspect the evidence model</span><h2>Understand every rule behind the study.</h2></div><Link className="button buttonDark" href="/metrics">Open intelligence reference <ArrowRight size={16}/></Link></section>
  </main>;
}
