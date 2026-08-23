"use client";

import { useSyncExternalStore } from "react";
import styles from "./companyChrome.module.css";

const CONSENT_KEY = "guardrails-consent";
type Consent = "granted" | "denied" | "unset";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getConsent(): Consent {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    // Storage unavailable: report unset rather than throwing.
  }
  return "unset";
}

function getServerConsent(): Consent {
  return "unset";
}

function notifyAll() {
  window.dispatchEvent(new Event("guardrails:consent-changed"));
  for (const listener of listeners) listener();
}

export default function ConsentResetButton() {
  const choice = useSyncExternalStore(subscribe, getConsent, getServerConsent);

  function update(next: Exclude<Consent, "unset">) {
    try {
      window.localStorage.setItem(CONSENT_KEY, next);
    } catch {
      // Without storage the preference is session-only.
    }
    if (next === "denied") {
      // Removing the tag stops new hits; already-sent data cannot be recalled.
      document.getElementById("gtag-script")?.remove();
    }
    notifyAll();
  }

  return (
    <div className={styles.consentActions}>
      <button
        className={choice === "granted" ? undefined : styles.grant}
        onClick={() => update("granted")}
      >
        {choice === "granted" ? "Analytics allowed" : "Allow analytics"}
      </button>
      <button
        className={choice === "granted" ? styles.grant : undefined}
        onClick={() => update("denied")}
      >
        {choice === "granted" ? "Turn off analytics" : "Analytics off"}
      </button>
    </div>
  );
}
