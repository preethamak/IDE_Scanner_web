import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Fingerprint,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import {
  getReproducibleBenchmark,
  immutableScanPath,
} from "@/lib/benchmarkEvidence";
import { websiteBenchmark as benchmark } from "@/lib/websiteBenchmark";
import styles from "./benchmark.module.css";

export const dynamic = "force-dynamic";

const publicationRules = [
  "No latest-version substitution",
  "No artifact-hash mismatch",
  "No incomplete analyzer coverage",
] as const;

export default async function BenchmarkPage() {
  const evidence = await getReproducibleBenchmark();
  const publicationRate = Math.round(
    (evidence.published / Math.max(evidence.rows.length, 1)) * 100,
  );

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true">
        <i />
        <i />
      </div>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <FlaskConical /> Frozen benchmark · live publication gate
          </span>
          <h1>
            A benchmark that shows
            <em> what it cannot prove.</em>
          </h1>
          <p>
            Thirty exact Marketplace artifacts are version-pinned and
            hash-pinned. Results appear only when the matching canonical Deep
            Scan can be reopened with complete analyzer coverage.
          </p>
          <div className={styles.heroActions}>
            <a href="#artifact-evidence">
              Inspect the corpus <ArrowRight />
            </a>
            <Link href="/settings">Read analysis boundaries</Link>
          </div>
        </div>
        <aside className={styles.gateCard}>
          <header>
            <Fingerprint />
            <span>
              <small>Current publication state</small>
              <strong>Exact evidence only</strong>
            </span>
          </header>
          <div className={styles.gauge}>
            <strong>{publicationRate}%</strong>
            <span>of frozen reports currently publishable</span>
            <i
              style={{ "--progress": `${publicationRate}%` } as CSSProperties}
            />
          </div>
          <dl>
            <div>
              <dt>Published</dt>
              <dd>{evidence.published}</dd>
            </div>
            <div>
              <dt>Withheld</dt>
              <dd>{evidence.awaiting}</dd>
            </div>
            <div>
              <dt>Frozen</dt>
              <dd>{evidence.rows.length}</dd>
            </div>
          </dl>
          <footer>
            <CheckCircle2 /> No evidence substitution
          </footer>
        </aside>
      </section>

      <section className={styles.metrics} aria-label="Benchmark summary">
        <article>
          <strong>{evidence.rows.length}</strong>
          <span>Hash-pinned artifacts</span>
          <small>Identity stays visible even while a result is withheld.</small>
        </article>
        <article>
          <strong>{benchmark.corpus.freshHoldouts}</strong>
          <span>Fresh-artifact holdouts</span>
          <small>Kept separate from prior-exposure controls.</small>
        </article>
        <article>
          <strong>{benchmark.corpus.priorExposureControls}</strong>
          <span>Prior-exposure controls</span>
          <small>Used to expose regression without inflating claims.</small>
        </article>
        <article>
          <strong>100%</strong>
          <span>Required analyzer coverage</span>
          <small>Anything less stays incomplete and unpublished.</small>
        </article>
      </section>

      <section className={styles.interpretation}>
        <div>
          <span>Correct interpretation</span>
          <h2>Reproducibility before headline numbers.</h2>
        </div>
        <div>
          <p>
            This page is an exact-artifact publication ledger, not a claim that
            one number describes all extension risk.
          </p>
          <p>
            A previous internal run and a newer registry scan cannot replace the
            canonical report for the frozen version and hash.
          </p>
        </div>
      </section>

      <section className={styles.gates}>
        <header>
          <span>Publication gate</span>
          <h2>Every visible result passes the same checks.</h2>
        </header>
        <div>
          <Metric
            icon={<Fingerprint />}
            title="Artifact match"
            value="Exact"
            detail="Extension identity, version, and SHA-256 agree."
          />
          <Metric
            icon={<ShieldCheck />}
            title="Analysis coverage"
            value="100%"
            detail="Every required analyzer completed for this report."
          />
          <Metric
            icon={<FileCheck2 />}
            title="Report identity"
            value="Immutable"
            detail="Scan ID, scanner build, and ruleset remain attached."
          />
        </div>
      </section>

      <section className={styles.evidence} id="artifact-evidence">
        <header>
          <div>
            <span>Artifact evidence</span>
            <h2>All 30 frozen identities, including withheld results.</h2>
          </div>
          <p>
            An awaiting row preserves corpus identity without inheriting an old
            outcome. Open any published row to inspect its immutable Deep Scan.
          </p>
        </header>
        <div className={styles.tableWrap}>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Exact artifact</span>
              <span>Cohort</span>
              <span>Publication</span>
              <span>Evidence</span>
              <span>Indexes</span>
            </div>
            {evidence.rows.map((row) => {
              const path = immutableScanPath(row);
              return (
                <article key={`${row.id}@${row.version}`}>
                  <div className={styles.identity}>
                    {path ? (
                      <Link href={path}>
                        <strong>{row.id}</strong>
                        <ArrowUpRight />
                      </Link>
                    ) : (
                      <strong>{row.id}</strong>
                    )}
                    <code>
                      @{row.version} · {row.sha256.slice(0, 16)}…
                    </code>
                  </div>
                  <Cell
                    primary={row.classification.replaceAll("-", " ")}
                    secondary={row.split.replaceAll("-", " ")}
                  />
                  <span className={styles.stateCell}>
                    <b className={styles[row.scan?.decision || "incomplete"]}>
                      {row.scan?.decision || "awaiting rerun"}
                    </b>
                    <small>
                      {row.scan
                        ? `${row.scan.coverage_percent}% coverage · scan ${row.scan.id.slice(0, 8)}`
                        : "No public result"}
                    </small>
                  </span>
                  <Cell
                    primary={
                      row.scan
                        ? row.scan.severity === "INFO"
                          ? "Informational"
                          : row.scan.severity
                        : "Withheld"
                    }
                    secondary={
                      row.scan
                        ? `Rules ${row.scan.ruleset_version}`
                        : "Pending exact Deep Scan"
                    }
                  />
                  <Cell
                    primary={
                      row.scan
                        ? `M${row.scan.malware_score} · R${row.scan.risk_score}`
                        : "Not published"
                    }
                    secondary={
                      row.scan ? "Diagnostic indexes" : "Identity only"
                    }
                  />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.refusals}>
        <div>
          <span>Non-negotiable</span>
          <h2>What this benchmark refuses to substitute.</h2>
          <p>
            A result stays withheld until the current scanner produces a
            complete canonical report for the frozen artifact.
          </p>
        </div>
        <ol>
          {publicationRules.map((rule, index) => (
            <li key={rule}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <strong>{rule}</strong>
              <span>Required</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.cta}>
        <Database />
        <div>
          <small>Evidence boundary</small>
          <h2>Re-run first. Publish second.</h2>
          <p>
            Use the severity guide to understand decisions and indexes without
            treating them as calibrated probabilities.
          </p>
        </div>
        <Link href="/scoring">
          Read the severity guide <ArrowRight />
        </Link>
      </section>
    </main>
  );
}

function Metric({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      {icon}
      <small>{title}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function Cell({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <span className={styles.cell}>
      <b>{primary}</b>
      <small>{secondary}</small>
    </span>
  );
}
