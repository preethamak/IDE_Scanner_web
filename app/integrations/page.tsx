import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Blocks,
  FileJson,
  MessagesSquare,
  MonitorSmartphone,
  Plug,
  TerminalSquare,
} from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Where Guardrails fits into your workflow: editors, Slack and email notifications, Jira tickets, the local CLI, portable reports, and audit exports.",
  alternates: { canonical: "/integrations" },
};

const groups = [
  {
    icon: MonitorSmartphone,
    name: "Editors",
    tagline: "Coverage where extensions are published",
    items: [
      "Marketplace registries used by VS Code, Cursor, and Windsurf",
      "Exact-release reports for every monitored version",
      "No editor plugins required — review happens beside the marketplace",
    ],
  },
  {
    icon: BellRing,
    name: "Release notifications",
    tagline: "Meaningful changes only",
    items: [
      "Email alerts when a release gains new capability",
      "Slack delivery targets, encrypted at rest",
      "Quiet re-publishes stay silent; behavioral changes do not",
    ],
  },
  {
    icon: MessagesSquare,
    name: "Team review",
    tagline: "Decisions land where the team already works",
    items: [
      "Weekly digest of watched-extension changes",
      "Jira tickets from review decisions",
      "Shared inbox with assignment and rationale",
    ],
  },
  {
    icon: TerminalSquare,
    name: "Local workflow",
    tagline: "Analysis on your machine",
    items: [
      "GuardRails CLI inspects extensions installed locally",
      "Portable report bundles move evidence without uploading it",
      "Import into the browser Reports library when you choose",
    ],
  },
  {
    icon: FileJson,
    name: "Evidence export",
    tagline: "Records your compliance flow can consume",
    items: [
      "Role-aware CSV and JSON audit export",
      "Immutable scan dossiers with stable links",
      "Public metrics and inventory endpoints for your own tooling",
    ],
  },
  {
    icon: Blocks,
    name: "Bring your own automation",
    tagline: "Build on the same evidence",
    items: [
      "Published API endpoints for scans, inventory, and rules",
      "Report bundles as a stable interchange format",
      "Webhook-friendly release events for pipeline gates",
    ],
  },
] as const;

export default function IntegrationsPage() {
  return (
    <main className={styles.page}>
      <i className={`${styles.glow} ${styles.glowOne}`} aria-hidden="true" />
      <i className={`${styles.glow} ${styles.glowTwo}`} aria-hidden="true" />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <Plug /> Integrations
          </span>
          <h1>
            Evidence where
            <em> your team already works.</em>
          </h1>
          <p>
            Guardrails does not ask you to live in another dashboard. Reports
            reach your inbox, your chat, your tracker, and your terminal — and
            stay portable everywhere.
          </p>
        </div>
        <aside>
          <BellRing />
          <strong>Notification, not noise.</strong>
          <p>
            Delivery targets are encrypted, testable from workspace settings,
            and limited to meaningful release changes.
          </p>
        </aside>
      </section>
      <section className={styles.plans}>
        {groups.map(({ icon: Icon, name, tagline, items }) => (
          <article className={styles.plan} key={name}>
            <span>
              <Icon /> {name}
            </span>
            <div className={styles.price}>
              <strong>{tagline}</strong>
            </div>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className={styles.honesty}>
        <div>
          <span>What integrations do not do</span>
          <h2>No ambient access. No silent expansion.</h2>
        </div>
        <ul>
          <li>
            Guardrails never asks for access to your editor, repositories, or
            source code — the product reviews published releases.
          </li>
          <li>
            Delivery targets (Slack, email, Jira) carry notifications out; they
            never grant Guardrails write access into those systems.
          </li>
          <li>
            Local CLI results stay on your machine until you deliberately
            export a portable report.
          </li>
        </ul>
      </section>
      <section className={styles.cta}>
        <div>
          <small>Start with one release</small>
          <h2>Check an extension today.</h2>
          <p>
            Open a public exact-release report, then wire notifications into
            the channel your team actually reads.
          </p>
        </div>
        <Link href="/registry">
          Search extensions <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
