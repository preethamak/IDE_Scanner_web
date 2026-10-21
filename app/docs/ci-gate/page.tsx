import type { Metadata } from "next";
import Link from "next/link";
import { Braces, CheckCircle2, CircleAlert, FileCheck2, LockKeyhole } from "lucide-react";
import styles from "../docs.module.css";

export const metadata: Metadata = {
  title: "GuardRails GitHub Actions Gate | Exact VS Code Extension Releases",
  description: "Fail CI when a pinned VS Code extension release lacks the required GuardRails exact-artifact evidence.",
  alternates: { canonical: "/docs/ci-gate" },
};

function Code({ label, children }: { label: string; children: string }) {
  return <><span className={styles.codeLabel}>{label}</span><pre className={styles.codeBlock}><code>{children}</code></pre></>;
}

export default function CiGateDocsPage() {
  return <main className={styles.page}>
    <div className={styles.inner}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}><FileCheck2 /> GuardRails by Abscissa / CI gate</span>
        <h1>Gate the exact extension release your workspace installs.</h1>
        <p>The GuardRails GitHub Action checks a pinned published VS Code extension release. It fails closed when the release is blocked, needs review, is unreviewed under the selected policy, or the service cannot return a valid decision.</p>
        <nav className={styles.toc} aria-label="CI gate sections"><a href="#workflow">Workflow</a><a href="#outputs">Outputs</a><a href="#failure">Failure behavior</a><a href="#boundary">Boundary</a></nav>
      </section>

      <section className={styles.section} id="workflow">
        <h2><Braces /> Add the gate to a workflow</h2>
        <p>Pin both the extension version and the action revision. A branch reference can change after review; a commit SHA binds the workflow to the action code you approved.</p>
        <Code label=".github/workflows/extension-gate.yml">{`jobs:
  gate-extension-release:
    runs-on: ubuntu-latest
    steps:
      - id: guardrails
        uses: preethamak/IDE_Scanner_web/.github/actions/guardrails-extension-gate@<reviewed-commit-sha>
        with:
          extension: publisher.name
          version: 1.2.3
          fail-on: unreviewed

      - name: Record reviewed release evidence
        run: |
          echo "Decision: \${{ steps.guardrails.outputs.decision }}"
          echo "Coverage: \${{ steps.guardrails.outputs.coverage-percent }}%"
          echo "Report: \${{ steps.guardrails.outputs.report-url }}"`}</Code>
        <div className={styles.note}>The action uses the public <code>GET /api/gate</code> endpoint. It does not require a repository token, inspect repository contents, install an extension, or write a GuardRails decision.</div>
      </section>

      <section className={styles.section} id="outputs">
        <h2><CheckCircle2 /> Consume bounded evidence outputs</h2>
        <p>Outputs are validated before being written to GitHub&apos;s output file. Treat them as workflow evidence, not as a replacement for the release report.</p>
        <div className={styles.paramTable}><table><thead><tr><th>Output</th><th>Values</th><th>Use</th></tr></thead><tbody>
          <tr><td><code>verdict</code></td><td><code>pass</code>, <code>fail</code>, <code>unreviewed</code></td><td>Gate result for the requested release.</td></tr>
          <tr><td><code>decision</code></td><td><code>allow</code>, <code>review</code>, <code>block</code>, <code>unknown</code></td><td>Recorded decision when analysis exists.</td></tr>
          <tr><td><code>severity</code></td><td>Known severity or <code>unknown</code></td><td>Highest reported release severity.</td></tr>
          <tr><td><code>coverage-percent</code></td><td><code>0</code>–<code>100</code> or <code>unknown</code></td><td>How much required analysis completed.</td></tr>
          <tr><td><code>report-url</code></td><td>Exact report URL or empty</td><td>Human review link for the same release.</td></tr>
          <tr><td><code>http-status</code></td><td>HTTP status</td><td>Operational troubleshooting signal.</td></tr>
        </tbody></table></div>
      </section>

      <section className={styles.section} id="failure">
        <h2><CircleAlert /> Read a failed gate correctly</h2>
        <p>A failed job is deliberately not a malware claim. It can mean the release needs human review, the exact version has no completed analysis, the endpoint was unavailable, or the response was malformed. The job summary includes the requested release, bounded decision values, HTTP result, and exact report link when available.</p>
        <p>When a release is unreviewed, scan or review that exact package before allowing it into a production workspace. Do not switch to a different release merely to make the gate pass.</p>
      </section>

      <section className={styles.section} id="boundary">
        <h2><LockKeyhole /> Scope and complement</h2>
        <p>This gate verifies published extension-package evidence for one version. It complements local independent scanning such as <Link href="/vsix-audit">vsix-audit</Link>, source review, dependency analysis, and repository controls; it does not replace them.</p>
        <p>For team inventories and an authenticated bulk endpoint, use the <Link href="/docs">Bulk gate API</Link>. For AI-assisted, read-only evidence lookup, see the <Link href="/docs/mcp">GuardRails MCP guide</Link>.</p>
      </section>
    </div>
  </main>;
}
