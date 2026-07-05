export default function SettingsPage() {
  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Wiring and deployment</p>
          <h1>How the website connects to the scanner</h1>
          <p className="heroCopy">
            The UI is Next.js. The scanning engine is Python. Today the API bridge runs the Python scanner from the same machine that hosts the Next server.
          </p>
        </div>
      </section>

      <section className="systemMap">
        <article>
          <span>Browser UI</span>
          <strong>Next.js pages</strong>
          <p>Select extensions, start scans, read reports, inspect scores, benchmark detection, and compare versions.</p>
        </article>
        <b>calls</b>
        <article>
          <span>API bridge</span>
          <strong>Next route handlers</strong>
          <p>Routes call <code>lib/pythonBridge.ts</code>, passing JSON payloads to the Python module.</p>
        </article>
        <b>executes</b>
        <article>
          <span>Scanner core</span>
          <strong>ide_scanner.web_bridge</strong>
          <p>Reads IDE extension folders, performs scans, and returns structured JSON reports.</p>
        </article>
      </section>

      <section className="modeGrid">
        <article className="modeCard good">
          <p className="eyebrow">Works now</p>
          <h2>Local desktop/server mode</h2>
          <p>Run the website and scanner on the same computer. The app can inventory and scan that computer&apos;s installed extensions.</p>
          <code>npm run dev</code>
        </article>
        <article className="modeCard warn">
          <p className="eyebrow">Works with limits</p>
          <h2>LAN or self-hosted mode</h2>
          <p>Other devices can open the UI, but scans still happen on the host machine where Next and Python are running.</p>
          <code>npm run dev:lan</code>
        </article>
        <article className="modeCard danger">
          <p className="eyebrow">Not enough alone</p>
          <h2>Hosted SaaS mode</h2>
          <p>A Vercel/Netlify/cloud deployment cannot read a user&apos;s local extension folders. It needs a local companion agent or desktop package.</p>
          <code>ide-scanner agent --server https://your-app</code>
        </article>
      </section>

      <section className="productionPlan">
        <div>
          <p className="eyebrow">Production path</p>
          <h2>Recommended architecture</h2>
          <p>
            Ship a small local command for Windows, macOS, and Linux. The hosted website manages reports, benchmarks, and history. The local command performs inventory and scans, then uploads the report JSON.
          </p>
        </div>
        <div className="pipeline">
          <span>Install agent</span>
          <span>Find IDE extensions</span>
          <span>Run scanner locally</span>
          <span>Upload report</span>
          <span>Review in web UI</span>
        </div>
      </section>

      <section className="twoColumnDocs">
        <div>
          <h2>Environment</h2>
          <details className="docDetail" open>
            <summary><strong>IDE_SCANNER_ROOT</strong><span>Path to the Python scanner repo.</span></summary>
            <p>Defaults to ../ide-scanner from this web app. Set it before starting Next if your scanner lives elsewhere.</p>
          </details>
          <details className="docDetail">
            <summary><strong>IDE_SCANNER_PYTHON</strong><span>Python executable override.</span></summary>
            <p>Use this when Python is not available as python3 on macOS/Linux or python on Windows.</p>
          </details>
        </div>
        <div>
          <h2>API behavior</h2>
          <details className="docDetail" open>
            <summary><strong>/api/inventory</strong><span>Lists extensions visible to the scanner host.</span></summary>
            <p>On a cloud host this usually returns the cloud container&apos;s environment, not the visitor&apos;s computer.</p>
          </details>
          <details className="docDetail" open>
            <summary><strong>/api/scans</strong><span>Runs Python scanner jobs from Next.</span></summary>
            <p>For production SaaS, replace direct local execution with an authenticated report upload from a local agent.</p>
          </details>
          <details className="docDetail" open>
            <summary><strong>/api/agent/reports</strong><span>Receives reports from user machines.</span></summary>
            <p>Set IDE_SCANNER_AGENT_TOKEN on the website and pass the same token to the agent command for bearer-token uploads.</p>
          </details>
        </div>
      </section>

      <section className="agentCommand">
        <div>
          <p className="eyebrow">User machine command</p>
          <h2>Run this on the computer you want to scan</h2>
          <p>The command scans local IDE extensions and uploads the report to this website.</p>
        </div>
        <pre className="jsonPreview">{`python -m ide_scanner.cli agent \\
  --server https://your-ide-scanner-web.example \\
  --token "$IDE_SCANNER_AGENT_TOKEN" \\
  --all`}</pre>
      </section>
    </main>
  );
}
