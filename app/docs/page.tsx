import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Bot,
  Boxes,
  Layers,
  ShieldCheck,
} from "lucide-react";
import styles from "./docs.module.css";

const HOST = "https://abscissa.dev";

function Code({ children, label }: { children: string; label?: string }) {
  return (
    <>
      {label ? <span className={styles.codeLabel}>{label}</span> : null}
      <pre className={styles.codeBlock}>
        <code>{children}</code>
      </pre>
    </>
  );
}

export default function DocsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>
            <BookOpen /> Developer documentation
          </span>
          <h1>Public APIs</h1>
          <p>
            Every endpoint below is backed by the same public analysis corpus
            you can browse on this site. Verdicts always refer to an exact
            analyzed release; an unanalyzed release is reported as unreviewed,
            never as an approval.
          </p>
          <nav className={styles.toc} aria-label="Sections">
            <a href="#gate">CI release gate</a>
            <a href="#bulk">Bulk gate</a>
            <a href="#badges">Badges</a>
            <a href="#inventory">Public inventory</a>
            <a href="#mcp">MCP server</a>
          </nav>
        </section>

        <section className={styles.section} id="gate">
          <h2>
            <ShieldCheck /> Gate releases in CI
          </h2>
          <span className={styles.endpoint}>
            <span className={styles.method}>GET</span>
            /api/gate?extension=publisher.name&amp;version=1.2.3
          </span>
          <p>
            Checks the latest completed public analysis for one exact release.
            A passing release returns HTTP 200; a failing release returns HTTP
            422, so <code>curl -fsS</code> breaks the pipeline with no parsing
            required.
          </p>
          <div className={styles.paramTable}>
            <table>
              <thead>
                <tr>
                  <th>Query parameter</th>
                  <th>Required</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>extension</code>
                  </td>
                  <td>Yes</td>
                  <td>
                    Extension id in <code>publisher.name</code> form.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>version</code>
                  </td>
                  <td>Yes</td>
                  <td>The exact release version to check.</td>
                </tr>
                <tr>
                  <td>
                    <code>fail-on=unreviewed</code>
                  </td>
                  <td>No</td>
                  <td>
                    Treat a release with no completed analysis as a failure.
                    Without it, an unreviewed release returns HTTP 200 with
                    verdict <code>unreviewed</code>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The response verdict is <code>pass</code>, <code>fail</code>, or{" "}
            <code>unreviewed</code>, alongside the underlying decision,
            severity, public outcome, coverage percentage, a reason, and a
            report path for the exact scan. Missing or malformed parameters
            return HTTP 400; backend outages return 502 or 503 rather than a
            verdict.
          </p>
          <Code label="curl">{`curl -fsS "${HOST}/api/gate?extension=publisher.name&version=1.2.3&fail-on=unreviewed"`}</Code>
          <Code label="Example response (HTTP 422 on fail)">{`{
  "extension": "publisher.name",
  "version": "1.2.3",
  "verdict": "fail",
  "decision": "review",
  "severity": "HIGH",
  "public_outcome": "investigate",
  "coverage_percent": 92,
  "reason": "Latest completed public analysis requires review or blocks this exact release.",
  "report": "/extensions/publisher.name/versions/1.2.3/scans/<scan_id>",
  "scan_id": "<scan_id>",
  "checked": { "extension_id": "publisher.name", "version": "1.2.3", "scanned_at": "..." }
}`}</Code>
          <Code label="GitHub Actions">{`jobs:
  gate-extension-release:
    runs-on: ubuntu-latest
    steps:
      - name: Gate the pinned extension release
        run: |
          curl -fsS "${HOST}/api/gate?extension=publisher.name&version=1.2.3&fail-on=unreviewed"`}</Code>
          <p className={styles.note}>
            Responses are cacheable for up to five minutes. Pin the exact
            version your workspace installs; the gate never substitutes a
            different release.
          </p>
        </section>

        <section className={styles.section} id="bulk">
          <h2>
            <Layers /> Bulk gate for team inventories
          </h2>
          <span className={styles.endpoint}>
            <span className={styles.method}>POST</span>
            /api/gate/bulk
          </span>
          <p>
            Checks up to <strong>200 releases</strong> in one call.
            Authentication is a team API key sent as a Bearer token; keys are
            managed in your team workspace settings. Unlike the single gate,
            the bulk endpoint always returns HTTP 200 with per-item verdicts
            and a summary, because a partial failure is meaningful data for a
            bulk caller.
          </p>
          <Code label="curl">{`curl -fsS -X POST "${HOST}/api/gate/bulk" \\
  -H "Authorization: Bearer $GUARDRAILS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "checks": [
      { "extension": "publisher.name", "version": "1.2.3" },
      { "extension": "other.tool", "version": "0.9.0" }
    ],
    "fail_on": "unreviewed"
  }'`}</Code>
          <Code label="Example response">{`{
  "results": [ { "extension": "publisher.name", "version": "1.2.3", "verdict": "pass", ... } ],
  "summary": { "pass": 1, "fail": 0, "unreviewed": 1 },
  "team_id": "<your team id>"
}`}</Code>
          <p>
            A missing or invalid key returns HTTP 401. An empty{" "}
            <code>checks</code> array, more than 200 checks, or an entry
            without a valid <code>publisher.name</code> and version returns
            HTTP 400 with the invalid entries listed.
          </p>
        </section>

        <section className={styles.section} id="badges">
          <h2>
            <BadgeCheck /> Trust badges
          </h2>
          <span className={styles.endpoint}>
            <span className={styles.method}>GET</span>
            /api/badge?extension=publisher.name&amp;version=1.2.3
          </span>
          <span className={styles.endpoint}>
            <span className={styles.method}>GET</span>
            {"/api/badge/{ecosystem}/{package}/{version}"}
          </span>
          <p>
            Both endpoints return an SVG badge showing the trust tier of an
            analyzed release. The query form takes an <code>extension</code>{" "}
            parameter and an optional <code>version</code> (latest analyzed
            release when omitted). The path form pins the badge to one exact
            version; currently only the <code>vscode</code> ecosystem is
            supported. A version-pinned badge never changes content — a new
            release earns a new URL only after its own analysis completes.
          </p>
          <p>
            Releases without a completed analysis render an
            &ldquo;analysis pending&rdquo; badge; the badge never guesses.
          </p>
          <Code label="Markdown">{`![GuardRails](${HOST}/api/badge/vscode/publisher.name/1.2.3)`}</Code>
          <Code label="HTML">{`<img src="${HOST}/api/badge?extension=publisher.name" alt="GuardRails trust badge" />`}</Code>
        </section>

        <section className={styles.section} id="inventory">
          <h2>
            <Boxes /> Public inventory
          </h2>
          <span className={styles.endpoint}>
            <span className={styles.method}>GET</span>
            /api/public/inventory
          </span>
          <p>
            The full public analysis catalog: every release analyzed under the
            current policy, with its decision, severity, public outcome,
            publisher verification, risk scores, artifact hash, and coverage.
            The response includes an <code>items</code> array and a{" "}
            <code>totals</code> summary. No authentication is required, and
            responses are cacheable for up to five minutes.
          </p>
          <Code label="curl">{`curl -fsS "${HOST}/api/public/inventory" | jq '.totals'`}</Code>
        </section>

        <section className={styles.section} id="mcp">
          <h2>
            <Bot /> Let your AI agent check risk before it recommends an
            extension
          </h2>
          <span className={styles.endpoint}>
            <span className={styles.method}>POST</span>
            /api/mcp
          </span>
          <p>
            GuardRails ships an MCP server over Streamable HTTP (stateless, no
            authentication) so coding agents can consult the public analysis
            corpus before suggesting an extension. It speaks MCP protocol
            version 2025-06-18; each request is a self-contained JSON-RPC 2.0
            message.
          </p>
          <Code label="Claude Code">{`claude mcp add --transport http guardrails ${HOST}/api/mcp`}</Code>
          <Code label="Generic MCP client configuration">{`{
  "mcpServers": {
    "guardrails": {
      "type": "http",
      "url": "${HOST}/api/mcp"
    }
  }
}`}</Code>
          <div className={styles.toolGrid}>
            <article className={styles.toolCard}>
              <strong>check_extension_risk</strong>
              <p>
                Input: <code>{`{ "extension": "publisher.name", "version": "1.2.3" }`}</code>{" "}
                (version optional). Returns the verdict, decision, severity,
                public outcome, coverage, a report URL, and a one-line
                recommendation: &ldquo;safe to recommend&rdquo;, &ldquo;needs
                human review&rdquo;, or &ldquo;do not recommend&rdquo;. Without
                a version, it reports the latest analyzed release.
              </p>
            </article>
            <article className={styles.toolCard}>
              <strong>find_reputable_alternatives</strong>
              <p>
                Input: <code>{`{ "query": "python linter" }`}</code>. Searches
                the public inventory by name, publisher, and description
                keywords and returns up to five extensions ranked by allowed
                decision, trust tier, publisher verification, and severity —
                useful when a candidate from an unknown publisher needs a safer
                substitute.
              </p>
            </article>
          </div>
          <p className={styles.note}>
            The server answers <code>initialize</code>, <code>tools/list</code>
            , and <code>tools/call</code>; unknown methods and tools return
            standard JSON-RPC errors. A GET request returns HTTP 405 — the
            endpoint is stateless and does not open a server-sent event stream.
          </p>
          <p>
            Questions about a verdict? Every tool result links to the exact
            report. See the <Link href="/scoring">scoring methodology</Link>{" "}
            for what decisions mean.
          </p>
        </section>
      </div>
    </main>
  );
}
