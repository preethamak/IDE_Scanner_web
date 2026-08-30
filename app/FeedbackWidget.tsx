"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, MessageSquarePlus, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  type FeedbackCategory,
} from "@/lib/feedback";
import styles from "./companyChrome.module.css";

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; emailDelivered: boolean }
  | { kind: "error"; message: string };

const initialForm = {
  category: "suggestion" as FeedbackCategory,
  message: "",
  contact_email: "",
  website: "",
};

export default function FeedbackWidget() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);

  function show() {
    setState({ kind: "idle" });
    setOpen(true);
  }

  function close() {
    setOpen(false);
    if (state.kind === "done") {
      setForm(initialForm);
      setState({ kind: "idle" });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "busy" });
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          message: form.message,
          contact_email: form.contact_email,
          page_path: pathname,
          website: form.website,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; email_delivered?: boolean }
        | null;
      if (!response.ok) throw new Error(payload?.error || "Feedback could not be sent.");
      setState({ kind: "done", emailDelivered: payload?.email_delivered === true });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Feedback could not be sent.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.feedbackLauncher}
        aria-expanded={open}
        aria-controls="feedback-dialog"
        onClick={open ? close : show}
      >
        {open ? <X /> : <MessageSquarePlus />}
        <span>{open ? "Close" : "Feedback"}</span>
      </button>

      {open ? (
        <div
          className={styles.feedbackOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            id="feedback-dialog"
            className={styles.feedbackDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            aria-describedby="feedback-description"
          >
            <header className={styles.feedbackHeader}>
              <div>
                <span className={styles.feedbackEyebrow}>GuardRails feedback</span>
                <h2 id="feedback-title">Help us make the next decision clearer.</h2>
              </div>
              <button type="button" className={styles.feedbackClose} aria-label="Close feedback" onClick={close}>
                <X />
              </button>
            </header>

            {state.kind === "done" ? (
              <div className={styles.feedbackSuccess} role="status">
                <CheckCircle2 />
                <h3>Thanks—we received your feedback.</h3>
                <p>
                  {state.emailDelivered
                    ? "It is with the GuardRails team now."
                    : "The team will review it shortly."}
                </p>
                <button type="button" className="button buttonDark" onClick={close}>
                  Done
                </button>
              </div>
            ) : (
              <form className={styles.feedbackForm} onSubmit={submit}>
                <p id="feedback-description" className={styles.feedbackDescription}>
                  Tell us what worked, what felt unclear, or what should change. Please do not include passwords, tokens, or private source code.
                </p>
                <label>
                  <span>What kind of feedback is this?</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as FeedbackCategory })}
                    disabled={state.kind === "busy"}
                  >
                    {FEEDBACK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {FEEDBACK_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Your feedback</span>
                  <textarea
                    required
                    minLength={3}
                    maxLength={4000}
                    rows={6}
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    placeholder="What should we know?"
                    disabled={state.kind === "busy"}
                  />
                </label>
                <label>
                  <span>Email for a reply <small>(optional)</small></span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.contact_email}
                    onChange={(event) => setForm({ ...form, contact_email: event.target.value })}
                    placeholder="you@company.com"
                    disabled={state.kind === "busy"}
                  />
                </label>
                <label className={styles.feedbackHoneypot} aria-hidden="true">
                  <span>Website</span>
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(event) => setForm({ ...form, website: event.target.value })}
                  />
                </label>
                <div className={styles.feedbackMeta}>
                  <span>Page context: {pathname}</span>
                  <span>Private message · limited to 5 per hour</span>
                </div>
                {state.kind === "error" ? <p className={styles.feedbackError} role="alert">{state.message}</p> : null}
                <button type="submit" className="button buttonDark" disabled={state.kind === "busy"}>
                  {state.kind === "busy" ? "Sending…" : <>Send feedback <Send /></>}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
