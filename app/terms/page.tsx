import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Scale, ShieldCheck } from "lucide-react";
import styles from "../trust.module.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern use of Guardrails: public reports, local CLI analysis, team workspaces, and paid plans.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "1. What Guardrails provides",
    body: [
      "Guardrails analyzes published IDE extension releases and presents the results as public exact-release reports. You can also analyze extensions installed on your machine with the local CLI, import portable report bundles into your browser, monitor watched extensions for meaningful changes, and coordinate review decisions in a team workspace.",
      "Public reports, the detection catalog, scoring methodology, and validation results are published openly so you can check our work.",
    ],
  },
  {
    title: "2. Accounts and workspaces",
    body: [
      "You may need an account to use monitoring or a team workspace. Keep your credentials safe, use an accurate contact address, and remember that you are responsible for the activity of members you invite to your workspace.",
      "Workspace owners and admins control roles, notification targets, and audit exports for their team.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: [
      "Do not abuse the service: no attempts to bypass rate limits, disrupt availability, access data that is not yours, or repackage our reports as another product without attribution.",
      "Automated access should use the published API endpoints within documented limits. Contact us before planning usage above those limits.",
    ],
  },
  {
    title: "4. What analysis can and cannot promise",
    body: [
      "Every report is point-in-time evidence about one exact release. Analysis is static and behavioral review is bounded; findings marked INCOMPLETE mean we could not verify enough to decide.",
      "A clean report is not a guarantee that an extension is safe, and a finding is not a legal determination. Use reports as one input alongside your own review and policies. The scoring methodology page explains how decisions are produced.",
    ],
  },
  {
    title: "5. Paid plans and billing",
    body: [
      "The Free plan costs nothing. Team and Business plans are introduced as early-access offerings and may carry fees once billing is enabled for your workspace; the amount and terms are always disclosed before a payment is confirmed.",
      "Paid subscriptions are billed through Stripe. You can change or cancel through the billing portal, and cancellation stops future charges while preserving your historical records.",
    ],
  },
  {
    title: "6. Third-party services",
    body: [
      "Guardrails depends on third parties it does not control: marketplace registries for package metadata, Stripe for payments when enabled, and delivery providers such as email, Slack, or Jira for notifications you configure. Their availability and terms are their own.",
      "Editor names and marketplace references describe where monitored extensions are published; GuardRails is not affiliated with or endorsed by those platforms.",
    ],
  },
  {
    title: "7. Privacy and your data",
    body: [
      "Our handling of received, retained, and controllable data is described on the privacy policy page. Imported report bundles stay in your browser until you choose to move them.",
    ],
  },
  {
    title: "8. Termination",
    body: [
      "You can stop using Guardrails at any time. We may suspend accounts or workspaces that violate these terms or create risk for other users; where practical, we will explain what happened and what restores access.",
    ],
  },
  {
    title: "9. Disclaimers and liability",
    body: [
      "The service is provided as is. To the fullest extent permitted by law, Guardrails is not liable for indirect or consequential damages, or for decisions you make based on reports alone.",
      "Nothing in these terms limits liability that cannot be limited by law.",
    ],
  },
  {
    title: "10. Changes and contact",
    body: [
      // TODO(owner): state the operating entity and governing jurisdiction before
      // charging money under this agreement.
      "We will post changes here and update the effective date below. Continued use after a change means acceptance. Governing law: [operating entity and jurisdiction to be confirmed]. Questions: hello@abscissa.dev for anything commercial or account-related, security@abscissa.dev for vulnerabilities.",
    ],
  },
] as const;

export default function TermsPage() {
  const effective = "Effective August 23, 2026";
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
            <Scale /> Legal
          </span>
          <h1>
            Terms of<br />
            <em>Service</em>
          </h1>
          <p>
            These terms cover the public registry, the local CLI, portable
            reports, release monitoring, team workspaces, and paid offerings.
            Please read them before using the service.
          </p>
          <div className={styles.actions}>
            <Link href="/faq">
              Common questions <ArrowRight />
            </Link>
            <Link href="/privacy">Read the privacy policy</Link>
          </div>
        </div>
        <div className={styles.assurance}>
          <header>
            <ShieldCheck />
            <span>
              <small>Status</small>
              <strong>{effective}</strong>
            </span>
          </header>
          <div>
            <span>Public reports</span>
            <strong>Free to inspect</strong>
          </div>
          <div>
            <span>Team plans</span>
            <strong>Early access</strong>
          </div>
          <div>
            <span>Charges</span>
            <strong>Disclosed before payment</strong>
          </div>
          <footer>
            <FileText /> Limitations of analysis results are described in section 4
          </footer>
        </div>
      </section>

      <section className={styles.boundaryList}>
        {sections.map((section) => (
          <article key={section.title}>
            <header>
              <span>
                <FileText />
              </span>
              <div>
                <h3>{section.title}</h3>
              </div>
            </header>
            <div>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.linkRail}>
        <Link href="/privacy">
          <span>Privacy policy</span>
          <strong>What is received, retained, and controlled.</strong>
          <ArrowRight />
        </Link>
        <Link href="/security">
          <span>Security</span>
          <strong>Practices and vulnerability disclosure.</strong>
          <ArrowRight />
        </Link>
        <Link href="/scoring">
          <span>Scoring methodology</span>
          <strong>How report decisions are produced.</strong>
          <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
