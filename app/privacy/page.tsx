import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileArchive,
  Globe2,
  HardDrive,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import ConsentResetButton from "../ConsentResetButton";
import styles from "../trust.module.css";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Guardrails receives, retains, and places under your control, including analytics consent, retention, deletion, and your rights.",
  alternates: { canonical: "/privacy" },
};

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

      <section className={styles.sectionHead} id="policy">
        <span>Formal privacy policy</span>
        <h2>The same boundaries, stated as policy.</h2>
        <p>
          Effective August 23, 2026. This section is the legally operative
          summary; everything above it remains the product-level explanation.
        </p>
      </section>
      <section className={styles.boundaryList}>
        <article>
          <header>
            <span>
              <ScrollText />
            </span>
            <div>
              <small>Who we are</small>
              <h3>Controller and contact</h3>
            </div>
          </header>
          <p>
            Guardrails (abscissa.dev) determines the purposes and means of
            processing described on this page. Privacy and data-subject
            requests: security@abscissa.dev. Vulnerability disclosure follows{" "}
            <Link href="/security">the security page</Link> and security.txt.
            {/* TODO(owner): name the operating legal entity once incorporated. */}
          </p>
        </article>
        <article>
          <header>
            <span>
              <Database />
            </span>
            <div>
              <small>What we process</small>
              <h3>Data and purposes</h3>
            </div>
          </header>
          <p>
            Account data (email, profile, auth provider identifiers) to operate
            sign-in and workspaces. Workspace content (decisions, watchlists,
            notification targets, audit history) to provide team review.
            Extension analysis results to publish public reports. Billing data
            passes through Stripe when a paid plan is enabled. Aggregate product
            events measure feature health.
          </p>
        </article>
        <article id="analytics">
          <header>
            <span>
              <Globe2 />
            </span>
            <div>
              <small>Website analytics</small>
              <h3>Consent-based, revocable</h3>
            </div>
          </header>
          <div>
            <p>
              Vercel Analytics collects cookieless page metrics for every visit.
              Google Analytics loads only after you allow it in the banner or
              here; declining leaves the site fully functional. Already-sent
              hits cannot be recalled, but turning analytics off stops new ones.
            </p>
            <ConsentResetButton />
          </div>
        </article>
        <article>
          <header>
            <span>
              <Trash2 />
            </span>
            <div>
              <small>Retention and rights</small>
              <h3>Retention, deletion, and your choices</h3>
            </div>
          </header>
          <p>
            Public reports are retained as published evidence. Workspace
            operational records persist until you request workspace deletion or
            remove them; audit retention windows follow your plan. Imported
            report bundles never leave your browser unless you export them. You
            can request access, correction, export, or deletion of your account
            data by contacting us; identity verification applies where one
            member could otherwise erase another team&apos;s record. Where GDPR
            or similar laws apply, you may also lodge a complaint with your
            supervisory authority.
          </p>
        </article>
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
