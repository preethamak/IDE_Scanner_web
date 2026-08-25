import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Radio,
} from "lucide-react";
import { getPublicStatus, type ServiceState } from "@/lib/publicStatus";
import type { Metadata } from "next";
import styles from "./status.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product status",
  description:
    "Live service checks across registry refreshes, Deep Scan runner health, canonical scan outcomes, notification delivery, and database reachability.",
  alternates: { canonical: "/status" },
};

const copy: Record<ServiceState, string> = {
  operational: "All measured systems operational",
  degraded: "Some systems are degraded",
  outage: "Service disruption detected",
  unknown: "Some health signals are unavailable",
};
export default async function StatusPage() {
  const status = await getPublicStatus();
  return (
    <main className={styles.page}>
      <i className={styles.glow} aria-hidden="true" />
      <section className={styles.hero}>
        <div>
          <span>
            <Radio />
            Live product status
          </span>
          <h1>
            Operational truth,<em> without the green-wash.</em>
          </h1>
          <p>
            Current service checks come from registry refreshes, Deep Scan
            runner health, canonical scan outcomes, notification delivery, and
            database reachability.
          </p>
        </div>
        <aside className={styles[status.overall]}>
          <StateIcon state={status.overall} />
          <div>
            <small>Current state</small>
            <strong>{copy[status.overall]}</strong>
            <time dateTime={status.checked_at}>
              Checked {formatDate(status.checked_at)}
            </time>
          </div>
        </aside>
      </section>
      <section className={styles.services}>
        <header>
          <div>
            <span>Service checks</span>
            <h2>Measured independently.</h2>
          </div>
          <p>
            An unavailable signal is shown as unknown. It is never converted
            into a reassuring operational state.
          </p>
        </header>
        <div>
          {status.services.map((service) => (
            <article key={service.id}>
              <StateIcon state={service.state} />
              <div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <small>{service.detail}</small>
              </div>
              <b className={styles[service.state]}>{service.state}</b>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.incidents}>
        <header>
          <div>
            <span>Incident history</span>
            <h2>Published operational events.</h2>
          </div>
          <p>
            Open incidents affect the overall status. Resolved incidents remain
            visible for accountability.
          </p>
        </header>
        {status.incidents.length ? (
          <div>
            {status.incidents.map((incident) => (
              <article key={incident.id}>
                <AlertTriangle />
                <div>
                  <span>
                    {incident.impact} impact · {incident.status}
                  </span>
                  <h3>{incident.title}</h3>
                  <p>{incident.summary}</p>
                  <time dateTime={incident.started_at}>
                    {formatDate(incident.started_at)}
                    {incident.resolved_at
                      ? ` — resolved ${formatDate(incident.resolved_at)}`
                      : ""}
                  </time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <CheckCircle2 />
            <div>
              <strong>No published incidents.</strong>
              <p>
                There are no incident records in the public log. Service checks
                above remain the authoritative current signal.
              </p>
            </div>
          </div>
        )}
      </section>
      <footer className={styles.machine}>
        <Clock3 />
        <div>
          <strong>Need a machine-readable check?</strong>
          <p>
            The public endpoint returns the same service states and incident
            list without credentials.
          </p>
        </div>
        <a href="/api/status">Open status JSON</a>
      </footer>
    </main>
  );
}
function StateIcon({ state }: { state: ServiceState }) {
  return state === "operational" ? (
    <CheckCircle2 />
  ) : state === "unknown" ? (
    <CircleHelp />
  ) : (
    <AlertTriangle />
  );
}
function formatDate(value: string) {
  return (
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
