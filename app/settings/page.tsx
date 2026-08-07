import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  FileArchive,
  Fingerprint,
  HardDrive,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import styles from "./settings.module.css";

const paths = [
  {
    icon: Cloud,
    label: "Published extension",
    title: "Deep Scan",
    location: "Disposable analysis runner",
    input: "One exact registry package",
    output: "Public immutable evidence",
    retained: "Artifact identity, findings, coverage, and scanner metadata",
    executes: false,
  },
  {
    icon: HardDrive,
    label: "Installed extension",
    title: "GuardRails CLI",
    location: "Your computer",
    input: "Local installed-extension snapshot",
    output: "Portable report bundle",
    retained:
      "Nothing by GuardRails unless you explicitly import or share the report",
    executes: false,
  },
  {
    icon: FileArchive,
    label: "Portable evidence",
    title: "Report importer",
    location: "Your browser",
    input: "Canonical report.zip",
    output: "Browser-local report library",
    retained: "Parsed report in browser storage until you remove it",
    executes: false,
  },
  {
    icon: LockKeyhole,
    label: "Team workflow",
    title: "Workspace",
    location: "Authenticated GuardRails service",
    input: "Monitored extension identities and team decisions",
    output: "Review queue, notifications, and audit history",
    retained:
      "Membership, monitoring, rationale, delivery health, and audit records",
    executes: false,
  },
] as const;

const guarantees = [
  [
    "Preflight is not Deep Scan",
    "A quick metadata or capability hint cannot become an approval.",
  ],
  [
    "Identity is not safety",
    "Popularity and publisher verification do not override artifact evidence.",
  ],
  [
    "Capability is not intent",
    "File, network, and process access describe power—not whether it is malicious.",
  ],
  [
    "Incomplete is not allow",
    "A missing required analyzer or unverifiable artifact remains incomplete.",
  ],
] as const;

export default function AnalysisBoundariesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <ShieldCheck /> Analysis boundaries
          </span>
          <h1>
            One product.
            <br />
            <em>Four different trust paths.</em>
          </h1>
          <p>
            GuardRails does not pretend every extension can be analyzed the same
            way. The source, execution boundary, retained evidence, and user
            control remain visible from the start.
          </p>
          <div className={styles.actions}>
            <Link href="/analyze">
              Choose an analysis path <ArrowRight />
            </Link>
            <Link href="/security">Review security controls</Link>
          </div>
        </div>
        <div className={styles.diagram} aria-label="Analysis boundary diagram">
          <header>
            <Fingerprint />
            <span>
              <small>Decision boundary</small>
              <strong>Exact evidence in, bounded claim out</strong>
            </span>
          </header>
          <div>
            <i>01</i>
            <span>Extension identity</span>
            <code>publisher.name@version</code>
          </div>
          <div>
            <i>02</i>
            <span>Artifact identity</span>
            <code>sha256 · immutable</code>
          </div>
          <div>
            <i>03</i>
            <span>Analysis coverage</span>
            <code>complete / incomplete</code>
          </div>
          <footer>
            <CheckCircle2 /> Decision never outruns available evidence
          </footer>
        </div>
      </section>

      <section className={styles.sectionHead}>
        <span>Product paths</span>
        <h2>Where analysis runs and what stays behind.</h2>
        <p>
          Each path answers a different question. Select the one matching where
          the extension or evidence exists today.
        </p>
      </section>
      <section className={styles.pathGrid}>
        {paths.map(
          ({
            icon: Icon,
            label,
            title,
            location,
            input,
            output,
            retained,
            executes,
          }) => (
            <article key={title}>
              <header>
                <span>
                  <Icon />
                </span>
                <div>
                  <small>{label}</small>
                  <h3>{title}</h3>
                </div>
              </header>
              <dl>
                <div>
                  <dt>Runs in</dt>
                  <dd>{location}</dd>
                </div>
                <div>
                  <dt>Receives</dt>
                  <dd>{input}</dd>
                </div>
                <div>
                  <dt>Produces</dt>
                  <dd>{output}</dd>
                </div>
                <div>
                  <dt>Retains</dt>
                  <dd>{retained}</dd>
                </div>
              </dl>
              <footer>
                {executes ? <XCircle /> : <CheckCircle2 />} Extension
                entrypoints are not executed
              </footer>
            </article>
          ),
        )}
      </section>

      <section className={styles.guarantees}>
        <div>
          <span>Interpretation rules</span>
          <h2>Boundaries the product will not blur.</h2>
          <p>
            These rules prevent a polished interface from overstating what the
            evidence proves.
          </p>
        </div>
        <div>
          {guarantees.map(([title, detail], index) => (
            <article key={title}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.next}>
        <span>
          <ScanSearch />
        </span>
        <div>
          <small>Need to inspect something?</small>
          <h2>Start from its current location.</h2>
          <p>
            Search a published extension, audit installed editors locally, or
            import a portable report without uploading it.
          </p>
        </div>
        <Link href="/analyze">
          Choose the path <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
