"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/scan?q=${encodeURIComponent(trimmed)}` : "/scan");
  }

  return (
    <main className="homeShell">
      <section className="landingHero">
        <div className="landingCopy">
          <p className="eyebrow">Extension security, verified before install</p>
          <h1>Know what a VS Code extension actually does before you trust it.</h1>
          <p>
            Search any published extension, scan it in seconds, and get an evidence-backed
            verdict &mdash; not a black-box score. Every finding traces back to the exact
            rule, file, and line that produced it.
          </p>
          <form className="landingSearch" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder='Search the marketplace, for example "gitlens" or publisher.extension-name'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search VS Code extensions"
            />
            <button className="primaryAction" type="submit">Search &amp; scan</button>
          </form>
          <div className="landingActions">
            <Link className="secondaryAction" href="/scoring">How scoring works</Link>
            <Link className="secondaryAction" href="/metrics">Browse all rules</Link>
          </div>
        </div>

        <aside className="heroConsole" aria-label="What a scan reports">
          <div className="consoleHeader">
            <span>Sample verdict</span>
            <strong>suspicious &middot; grade D</strong>
          </div>
          <div className="consoleGrade">
            <strong>78</strong>
            <p>Malware score 78/100. Dynamic call target resolved via computed member access that folds to &ldquo;eval&rdquo; &mdash; a string-concatenation evasion caught by AST analysis, not plain-text regex.</p>
          </div>
          <div className="consoleScores">
            <MiniStat label="Risk score" value={83} />
            <MiniStat label="Findings" value={6} />
            <MiniStat label="Evidence class" value="capability" />
          </div>
        </aside>
      </section>

      <section className="homeStrip">
        <span>Live marketplace search</span>
        <span>AST-based evasion detection</span>
        <span>Evidence-graded verdicts</span>
        <span>Full rule reference</span>
        <span>Static-only, sandboxed extraction</span>
      </section>

      <section className="homeCards">
        <article>
          <IconTile label="1" />
          <h2>Search</h2>
          <p>Type an extension name or publisher.id and pick it from live VS Marketplace results &mdash; install counts, ratings, and verified-publisher status included.</p>
        </article>
        <article>
          <IconTile label="2" />
          <h2>Scan</h2>
          <p>The package is downloaded server-side into a quarantined extraction and statically analyzed: manifest posture, dependency graph, regex rules, and an AST walk for obfuscated JS. No code from the package is ever executed.</p>
        </article>
        <article>
          <IconTile label="3" />
          <h2>Read the evidence</h2>
          <p>Every verdict links back to the findings that produced it &mdash; rule id, evidence class, file and line &mdash; so you can judge the reasoning yourself instead of trusting a single number.</p>
        </article>
      </section>

      <section className="agentHero">
        <div>
          <p className="eyebrow">Why static, not sandboxed execution</p>
          <h2>Hosted scans never run the extension</h2>
          <p>
            Extensions pulled from the marketplace or uploaded by a visitor are attacker-reachable
            by construction. This service only ever runs the static analysis path &mdash; manifest
            inspection, regex rules, dependency posture, and the AST walker &mdash; against a
            quarantined copy. Dynamic sandbox execution stays reserved for the local CLI, run by
            hand against extensions already installed on your own machine.
          </p>
        </div>
        <pre>{`ide-scanner scan --installed --profile smart --output report.zip
ide-scanner scan --path ./my-extension --sandbox --allow-execute`}</pre>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function IconTile({ label }: { label: string }) {
  return <span className="productIcon">{label}</span>;
}
