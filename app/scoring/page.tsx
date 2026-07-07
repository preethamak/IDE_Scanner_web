import Link from "next/link";

const scoreBands = [
  ["0", "No actionable evidence", "Context findings may exist, but they are not strong enough to create review risk."],
  ["1-39", "Low review pressure", "Weak or reputation-only evidence. Usually acceptable unless the extension is unexpected."],
  ["40-79", "Review", "Sensitive capability, dependency, provenance, or posture evidence should be inspected."],
  ["80-100", "High priority", "Suspicious chains, strong provenance signals, observed behavior, or confirmed intelligence."],
];

const verdicts = [
  ["Clean", "No actionable malware, abuse-chain, dependency, provenance, or sensitive-capability evidence was identified."],
  ["Review", "The extension has meaningful risk signals but no confirmed malware evidence."],
  ["Suspicious", "Correlated behavior, observed suspicious behavior, or non-authoritative malware-like evidence exists."],
  ["Malicious", "Authoritative evidence exists, such as known-bad hashes or trusted threat-feed hits."],
];

export default function ScoringPage() {
  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Scoring model</p>
          <h1>Grades, risk, and malware score</h1>
          <p className="heroCopy">Risk score, malware score, verdict, and grade are emitted by ide-scanner. The website renders those fields without recalculating them.</p>
        </div>
        <Link className="heroAction" href="/metrics">View metrics</Link>
      </section>

      <section className="scoreExplainer">
        <article>
          <span>Risk score</span>
          <strong>0-100</strong>
          <p>Captures sensitive capability, supply-chain exposure, provenance posture, weak indicators, and correlated abuse potential.</p>
        </article>
        <article>
          <span>Malware score</span>
          <strong>0-100</strong>
          <p>Captures confirmed or strongly correlated malicious evidence. A high risk score can exist while malware score remains zero.</p>
        </article>
        <article>
          <span>Grade</span>
          <strong>A-F</strong>
          <p>Readable scanner-owned rollup for one extension. The UI displays the grade from `leaderboard.json` and extension detail files.</p>
        </article>
      </section>

      <section className="twoColumnDocs">
        <div>
          <h2>Score bands</h2>
          {scoreBands.map(([band, title, detail]) => (
            <details className="docDetail" key={band}>
              <summary><strong>{band}</strong><span>{title}</span></summary>
              <p>{detail}</p>
            </details>
          ))}
        </div>
        <div>
          <h2>Verdicts</h2>
          {verdicts.map(([label, detail]) => (
            <details className="docDetail" key={label}>
              <summary><strong>{label}</strong><span>{detail}</span></summary>
              <p>{detail}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
