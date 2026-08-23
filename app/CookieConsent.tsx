"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import styles from "./companyChrome.module.css";

const CONSENT_KEY = "guardrails-consent";
const GA_ID = "G-TRTLLGPJ5C";

function loadGoogleAnalytics() {
  if (document.getElementById("gtag-script")) return;
  const dataLayerScript = document.createElement("script");
  dataLayerScript.textContent = [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    `gtag('js', new Date());`,
    `gtag('config', '${GA_ID}');`,
  ].join("\n");
  const gaScript = document.createElement("script");
  gaScript.id = "gtag-script";
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.append(gaScript, dataLayerScript);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const apply = () => {
      try {
        if (window.localStorage.getItem(CONSENT_KEY) === "granted") {
          loadGoogleAnalytics();
        } else if (!window.localStorage.getItem(CONSENT_KEY)) {
          setVisible(true);
        }
      } catch {
        // Storage unavailable (strict private mode): stay opted out silently.
      }
    };
    apply();
    window.addEventListener("guardrails:consent-changed", apply);
    return () =>
      window.removeEventListener("guardrails:consent-changed", apply);
  }, []);

  function decide(choice: "granted" | "denied") {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Without storage the banner would nag every visit; hide it anyway.
    }
    setVisible(false);
    if (choice === "granted") loadGoogleAnalytics();
  }

  if (!visible) return null;

  return (
    <aside className={styles.consentBanner} aria-label="Analytics cookie consent">
      <strong>
        <Cookie style={{ width: 13, verticalAlign: "-2px" }} /> Optional analytics
      </strong>
      <p>
        Guardrails loads Google Analytics only if you accept. The site works
        fully without it. Details in the{" "}
        <Link href="/privacy#analytics">privacy policy</Link>.
      </p>
      <div className={styles.consentActions}>
        <button className={styles.grant} onClick={() => decide("granted")}>
          Allow analytics
        </button>
        <button onClick={() => decide("denied")}>Continue without</button>
      </div>
    </aside>
  );
}
