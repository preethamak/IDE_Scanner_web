import Link from "next/link";

const reportSections = [
  ["summary", "Totals by verdict and severity, max risk score, max malware score, and scan size."],
  ["top_risk_extensions", "Ranked extension summaries used by the UI for triage."],
  ["findings", "Rule-level evidence, severity, confidence, file references, and recommendations."],
  ["artifact_inventory", "Hashed package files, risky native or packed artifacts, and known-bad hash matches."],
  ["registry_checks", "Optional online marketplace and dependency enrichment results."],
  ["posture_summary", "Overall IDE/client setup risk: score, status, client count, failure/warning counts, and top posture findings."],
  ["posture", "Detailed local IDE/client posture checks for Workspace Trust, auto-approval, sideloading, startup activation, and agent-facing extension surfaces."],
];

export default function ReportsPage() {
  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Output</p>
          <h1>Reports and API flow</h1>
        <p className="heroCopy">The UI uses the same API you can automate against. Local scans and agent uploads both produce the same report shape.</p>
        </div>
        <Link className="heroAction" href="/">Create report</Link>
      </section>

      <section className="apiFlow">
        <article><span>1</span><strong>GET /api/inventory</strong><p>Discover installed extensions from VS Code, Cursor, Windsurf, and compatible folders.</p></article>
        <article><span>2</span><strong>POST /api/scans</strong><p>Start a scan for selected extension paths. The response returns a local job id.</p></article>
        <article><span>3</span><strong>GET /api/scans/:id</strong><p>Poll until the job is complete and a summary is available.</p></article>
        <article><span>4</span><strong>POST /api/agent/reports</strong><p>Upload a completed user-machine report from the local companion command.</p></article>
        <article><span>5</span><strong>GET /api/scans/:id/report</strong><p>Download the full JSON report with every finding and artifact detail.</p></article>
      </section>

      <section className="twoColumnDocs">
        <div>
          <h2>Report sections</h2>
          {reportSections.map(([label, detail]) => (
            <details className="docDetail" key={label}>
              <summary><strong>{label}</strong><span>{detail}</span></summary>
              <p>{detail}</p>
            </details>
          ))}
        </div>
        <pre className="jsonPreview">{`{
  "summary": {
    "total_extensions": 12,
    "max_risk_score": 59,
    "max_malware_score": 0,
    "posture_score": 78,
    "posture_status": "failure"
  },
  "posture_summary": {
    "status": "failure",
    "score": 78,
    "counts": {
      "failure": 2,
      "warning": 3
    }
  },
  "top_risk_extensions": [
    {
      "extension_id": "publisher.name",
      "verdict": "review",
      "risk_score": 59,
      "malware_score": 0
    }
  ]
}`}</pre>
      </section>
    </main>
  );
}
