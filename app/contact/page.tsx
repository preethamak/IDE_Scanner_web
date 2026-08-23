import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  Handshake,
  LifeBuoy,
  Mail,
  ShieldAlert,
} from "lucide-react";
import styles from "../trust.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the Guardrails team: security disclosure, product questions, team plan inquiries, and support for workspaces.",
  alternates: { canonical: "/contact" },
};

const channels = [
  {
    icon: ShieldAlert,
    label: "Security issues",
    title: "Report a vulnerability",
    body: "Found a security problem in Guardrails or a malicious extension worth urgent review? Email us directly — coordinated disclosure, credit given.",
    action: "security@abscissa.dev",
    href: "mailto:security@abscissa.dev",
  },
  {
    icon: Handshake,
    label: "Teams, reviews, monitoring",
    title: "Work with us directly",
    body: "Guided reviews of extensions you care about, release-monitoring early access, or rollout requirements for your organization — all start with this conversation.",
    action: "Apply as a design partner",
    href: "/design-partners",
  },
  {
    icon: LifeBuoy,
    label: "Product and support",
    title: "Everything else",
    body: "Questions about reports, monitoring launch access, report orders, or your account — write from your workspace email where relevant so ownership is quick to verify.",
    action: "hello@abscissa.dev",
    href: "mailto:hello@abscissa.dev?subject=Guardrails%20support",
  },
  {
    icon: Bug,
    label: "Wrong findings",
    title: "Dispute a report",
    body: "Every decision page shows its evidence. If a finding looks wrong, send the exact release link with what we missed — corrections ship in public.",
    action: "Read scoring methodology",
    href: "/scoring",
  },
] as const;

export default function ContactPage() {
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
            <Mail /> Contact
          </span>
          <h1>
            Reach the people
            <br />
            <em>behind the reports.</em>
          </h1>
          <p>
            One small team builds Guardrails and reads every message. Pick the
            path that gets you the fastest answer.
          </p>
          <div className={styles.actions}>
            <Link href="/status">
              Check service status <ArrowRight />
            </Link>
            <Link href="/faq">Read common questions</Link>
          </div>
        </div>
        <div className={styles.assurance}>
          <header>
            <Mail />
            <span>
              <small>General inquiries</small>
              <strong>hello@abscissa.dev</strong>
            </span>
          </header>
          <div>
            <span>Security response</span>
            <strong>Coordinated</strong>
          </div>
          <div>
            <span>Commercial</span>
            <strong>Design-partner form</strong>
          </div>
          <div>
            <span>Status history</span>
            <strong>Public</strong>
          </div>
          <footer>
            <Bug /> Report disputes ship as visible methodology updates
          </footer>
        </div>
      </section>

      <section className={styles.boundaryList}>
        {channels.map(({ icon: Icon, label, title, body, action, href }) => (
          <article key={label}>
            <header>
              <span>
                <Icon />
              </span>
              <div>
                <small>{label}</small>
                <h3>{title}</h3>
              </div>
            </header>
            <div>
              <p>{body}</p>
              {href.startsWith("/") ? (
                <Link href={href}>
                  {action} <ArrowRight />
                </Link>
              ) : (
                <a href={href}>
                  {action} <ArrowRight />
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.linkRail}>
        <Link href="/about">
          <span>About</span>
          <strong>What Guardrails checks and why.</strong>
          <ArrowRight />
        </Link>
        <Link href="/pricing">
          <span>Pricing</span>
          <strong>Free reports, early-access teams.</strong>
          <ArrowRight />
        </Link>
        <Link href="/benchmark">
          <span>Validation</span>
          <strong>Published corpus, coverage, limits.</strong>
          <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
