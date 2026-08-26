"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LogOut, Sparkles } from "lucide-react";
import BrandMark from "@/app/BrandMark";
import styles from "@/app/workspace/teamWorkspace.module.css";

export default function WorkspaceOnboarding({
  email,
  onCreate,
  onSignOut,
}: {
  email: string;
  onCreate: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onCreate(name.trim());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create workspace.",
      );
      setSaving(false);
    }
  }
  return (
    <main className={styles.onboarding}>
      <header>
        <div>
          <BrandMark />
          <strong>GuardRails</strong>
        </div>
        <button onClick={() => void onSignOut()}>
          <LogOut /> Sign out
        </button>
      </header>
      <section>
        <span className={styles.step}>Step 1 of 3</span>
        <div className={styles.onboardingIcon}>
          <Sparkles />
        </div>
        <h1>Build your security workspace.</h1>
        <p>
          Start with a name. Next, GuardRails will help you monitor your first
          extension and invite your team.
        </p>
        <form onSubmit={submit}>
          <label>
            Workspace name
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Engineering"
              maxLength={80}
            />
          </label>
          <button disabled={saving || !name.trim()}>
            {saving ? "Creating workspace…" : "Continue"}
            <ArrowRight />
          </button>
          {error ? <small>{error}</small> : null}
        </form>
        <div className={styles.onboardingPromise}>
          <span>
            <CheckCircle2 /> Exact release baselines
          </span>
          <span>
            <CheckCircle2 /> Meaningful change alerts
          </span>
          <span>
            <CheckCircle2 /> Auditable team decisions
          </span>
        </div>
        <small>Signed in as {email}</small>
      </section>
    </main>
  );
}
