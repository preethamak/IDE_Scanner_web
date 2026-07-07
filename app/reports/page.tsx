import Link from "next/link";

const bundleSections = [
  ["metadata.json", "Scan identity, schema version, scanner version, ruleset version, source, profile, and completion counts."],
  ["summary.json", "Small dashboard-first totals, top risk extensions, finding counts, severity counts, and category counts."],
  ["leaderboard.json", "Compact table rows with scanner-owned verdict, severity, risk score, malware score, grade, top findings, and detail refs."],
  ["extensions/*.json", "Lazy-loaded extension detail files with score explanations, findings, evidence refs, manifest, dependencies, artifacts, and recommendations."],
  ["rules.json", "Scanner rule metadata for explanations, rule pages, false-positive notes, and benchmark tags."],
  ["posture.json", "IDE/client posture summary and detailed posture metrics from scanner output."],
];

export default function ReportsPage() {
  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Scanner bundle contract</h1>
          <p className="heroCopy">The website renders report bundles. It does not create findings, verdicts, risk scores, malware scores, or grades.</p>
        </div>
        <Link className="heroAction" href="/scan">Import report</Link>
      </section>

      <section className="apiFlow">
        <article><span>1</span><strong>Run scanner</strong><p><code>ide-scanner scan --installed --profile smart --output report.zip</code></p></article>
        <article><span>2</span><strong>Import bundle</strong><p>Upload `report.zip`; the browser reads summary and leaderboard first.</p></article>
        <article><span>3</span><strong>Open dashboard</strong><p>Filter and sort scanner-provided leaderboard rows.</p></article>
        <article><span>4</span><strong>Lazy-load detail</strong><p>Extension pages load only their referenced `extensions/*.json` detail file.</p></article>
      </section>

      <section className="twoColumnDocs">
        <div>
          <h2>Bundle files</h2>
          {bundleSections.map(([label, detail]) => (
            <details className="docDetail" key={label}>
              <summary><strong>{label}</strong><span>{detail}</span></summary>
              <p>{detail}</p>
            </details>
          ))}
        </div>
        <pre className="jsonPreview">{`report.zip
  metadata.json
  summary.json
  leaderboard.json
  posture.json
  rules.json
  extensions/
    publisher.name@1.2.3.json`}</pre>
      </section>
    </main>
  );
}
