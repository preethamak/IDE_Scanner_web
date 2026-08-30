"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import styles from "./companyChrome.module.css";

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState({ kind: "busy" });
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Subscription failed.");
      }
      setState({ kind: "done" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Subscription failed.",
      });
    }
  }

  if (state.kind === "done") {
    return (
      <div className={styles.newsletterDone}>
        <CheckCircle2 /> You are on the list. Release notes arrive with major
        product and research updates.
      </div>
    );
  }

  return (
    <form className={styles.newsletter} onSubmit={submit}>
      <label htmlFor="footer-newsletter-email">
        Release notes by email
      </label>
      <div>
        <input
          id="footer-newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={state.kind === "busy"}
        />
        <button type="submit" disabled={state.kind === "busy"}>
          {state.kind === "busy" ? "Joining…" : "Subscribe"} <ArrowRight />
        </button>
      </div>
      {state.kind === "error" ? (
        <small role="alert">{state.message}</small>
      ) : (
        <small>
          Product and research updates only. Unsubscribe any time via
          hello@abscissa.dev.
        </small>
      )}
    </form>
  );
}
