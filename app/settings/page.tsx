export default function SettingsPage() {
  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Local settings</p>
          <h1>Scanner configuration</h1>
          <p className="heroCopy">The web app runs locally and calls the Python scanner through Next API routes.</p>
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
          <h2>Run modes</h2>
          <details className="docDetail" open>
            <summary><strong>npm run dev</strong><span>Local-only server on 127.0.0.1:8765.</span></summary>
            <p>Best for personal use. Other machines cannot access it.</p>
          </details>
          <details className="docDetail">
            <summary><strong>npm run dev:lan</strong><span>LAN server on 0.0.0.0:8765.</span></summary>
            <p>Use only on trusted networks because the server can scan local extension paths on this machine.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
