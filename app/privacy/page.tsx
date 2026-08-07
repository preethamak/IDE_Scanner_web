import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileArchive,
  Globe2,
  HardDrive,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import styles from "../trust.module.css";

const boundaries = [
  {
    icon: Globe2,
    label: "Public intelligence",
    title: "Published extensions",
    receives:
      "Registry metadata and the exact published package selected for analysis.",
    retains:
      "Versions, hashes, normalized findings, dependencies, file inventory, coverage, and scanner identity may remain publicly available.",
    control: "Public reports can be shared without an account.",
  },
  {
    icon: HardDrive,
    label: "Local workflow",
    title: "Installed extensions",
    receives:
      "The GuardRails website does not enumerate extensions installed on your computer.",
    retains:
      "Local CLI analysis stays on the machine unless you explicitly export or import a portable report.",
    control: "You choose when a report leaves the local workflow.",
  },
  {
    icon: FileArchive,
    label: "Browser storage",
    title: "Imported report bundles",
    receives:
      "A report.zip selected or dropped into the Analyze or Reports page.",
    retains:
      "The parsed report is stored in this browser, not uploaded by the report importer.",
    control: "Remove individual reports from the local report library.",
  },
  {
    icon: LockKeyhole,
    label: "Private workspace",
    title: "Account and team data",
    receives:
      "Profile, workspace membership, monitored extensions, review decisions, notification preferences, and delivery targets.",
    retains:
      "Operational history is retained for workspace review and audit. Sensitive channel targets are encrypted and excluded from exports.",
    control: "Workspace roles govern access to team data and audit exports.",
  },
] as const;

export default function PrivacyPage() {
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
            <Database /> GuardRails data handling
          </span>
          <h1>
            Know what crosses
            <br />
            <em>each boundary.</em>
          </h1>
          <p>
            Public packages, installed extensions, imported reports, and team
            workspaces do not follow the same data path. GuardRails keeps those
            differences explicit.
          </p>
          <div className={styles.actions}>
            <Link href="/analyze">
              Choose an analysis path <ArrowRight />
            </Link>
            <Link href="/settings">Read analysis boundaries</Link>
          </div>
        </div>
        <div className={styles.assurance}>
          <header>
            <ShieldCheck />
            <span>
              <small>Default posture</small>
              <strong>Minimum necessary data</strong>
            </span>
          </header>
          <div>
            <span>Public registry reports</span>
            <strong>Shareable</strong>
          </div>
          <div>
            <span>Imported reports</span>
            <strong>Browser local</strong>
          </div>
          <div>
            <span>Workspace decisions</span>
            <strong>Access controlled</strong>
          </div>
          <footer>
            <CheckCircle2 /> Raw notification credentials are never exported
          </footer>
        </div>
      </section>

      <section className={styles.sectionHead}>
        <span>Data map</span>
        <h2>Four product paths. Four clear boundaries.</h2>
        <p>
          “Private” describes an access boundary, not a claim that no
          operational data exists. Each path below states what is received,
          retained, and controlled.
        </p>
      </section>
      <section className={styles.boundaryList}>
        {boundaries.map(
          ({ icon: Icon, label, title, receives, retains, control }) => (
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
                  <dt>What is received</dt>
                  <dd>{receives}</dd>
                </div>
                <div>
                  <dt>What is retained</dt>
                  <dd>{retains}</dd>
                </div>
                <div>
                  <dt>Your control</dt>
                  <dd>{control}</dd>
                </div>
              </dl>
            </article>
          ),
        )}
      </section>

      <section className={styles.disclosure}>
        <span>
          <Trash2 />
        </span>
        <div>
          <small>Deletion and export</small>
          <h2>Local reports stay under your control.</h2>
          <p>
            Imported report bundles can be removed from the Reports library.
            Account and workspace export or deletion requests require identity
            verification so one member cannot erase another team’s operational
            record.
          </p>
        </div>
        <div className={styles.disclosureSteps}>
          <strong>Useful distinctions</strong>
          <span>Local report · browser storage</span>
          <span>Public report · published evidence</span>
          <span>Workspace event · access controlled</span>
          <span>Delivery target · encrypted</span>
        </div>
      </section>

      <section className={styles.linkRail}>
        <Link href="/security">
          <span>Security</span>
          <strong>Review product controls and disclosure.</strong>
          <ArrowRight />
        </Link>
        <Link href="/analyze">
          <span>Analyze</span>
          <strong>Choose the correct evidence boundary.</strong>
          <ArrowRight />
        </Link>
        <Link href="/reports">
          <span>Local reports</span>
          <strong>Open or remove imported evidence.</strong>
          <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
