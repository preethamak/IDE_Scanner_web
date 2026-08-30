"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Clipboard,
  FileCode2,
  KeyRound,
  Network,
  Share2,
  TerminalSquare,
  Waypoints,
} from "lucide-react";
import type {
  PermissionCategoryId,
  PermissionPassportModel,
} from "@/lib/permissionPassport";
import styles from "./permissionPassport.module.css";

const icons = {
  files: FileCode2,
  terminal: TerminalSquare,
  network: Network,
  secrets: KeyRound,
  editor: Waypoints,
  agents: Bot,
} satisfies Record<PermissionCategoryId, typeof FileCode2>;

export default function PermissionPassport({
  passport,
  reportHref,
  compact = false,
}: {
  passport: PermissionPassportModel;
  reportHref?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const freshness = freshnessCopy(passport);
  const observed = passport.categories.filter(
    (category) => category.state === "observed",
  ).length;
  function download() {
    const blob = new Blob([JSON.stringify(passport, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${passport.extension_id}-${passport.analyzed_version}-permission-passport.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }
  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <section
      className={`${styles.passport} ${compact ? styles.compact : ""}`}
      aria-labelledby={`permission-passport-${passport.analyzed_version}`}
    >
      <header>
        <div>
          <span>Permission Passport · exact release</span>
          <h2 id={`permission-passport-${passport.analyzed_version}`}>
            What this extension can reach.
          </h2>
          <p>
            Six consistent access categories, tied to version{" "}
            {passport.analyzed_version}. Capability describes power—not
            malicious intent.
          </p>
        </div>
        <div className={`${styles.freshness} ${styles[passport.freshness]}`}>
          <strong>{freshness.title}</strong>
          <small>{freshness.detail}</small>
        </div>
      </header>
      <div className={styles.summary}>
        <span>
          <b>{observed}</b> categories observed
        </span>
        <span>
          <b>@{passport.analyzed_version}</b> analyzed release
        </span>
        <span>
          <b>{passport.artifact_sha256 ? "Bound" : "Pending"}</b> artifact
          identity
        </span>
      </div>
      <div className={styles.categories}>
        {passport.categories.map((category) => {
          const Icon = icons[category.id];
          return (
            <article key={category.id} data-state={category.state}>
              <Icon />
              <div>
                <span>{category.summary}</span>
                <strong>{category.label}</strong>
                <p>
                  {category.signals.length
                    ? category.signals.join(" · ")
                    : category.state === "unknown"
                      ? "No completed analysis for this release."
                      : "Not observed in this scan—not a guarantee of absence."}
                </p>
              </div>
              <em>
                {category.state === "observed" ? <Check /> : null}
                {category.state === "observed"
                  ? "Observed"
                  : category.state === "unknown"
                    ? "Unknown"
                    : "Not observed"}
              </em>
            </article>
          );
        })}
      </div>
      <footer>
        <span>This passport never carries forward to another version.</span>
        <div>
          <button type="button" onClick={() => void copyLink()}>
            {copied ? <Check /> : <Share2 />} {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" onClick={download}>
            <Clipboard /> Export JSON
          </button>
          {reportHref ? (
            <Link href={reportHref}>
              Review evidence <ChevronRight />
            </Link>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

function freshnessCopy(passport: PermissionPassportModel) {
  if (passport.freshness === "current")
    return {
      title: "Current analysis",
      detail: `Latest release @${passport.latest_version}`,
    };
  if (passport.freshness === "newer_release")
    return {
      title: "Newer release available",
      detail: `Latest is @${passport.latest_version}`,
    };
  if (passport.freshness === "pending")
    return {
      title: "Analysis incomplete",
      detail: "Do not treat this as approval",
    };
  return { title: "Not analyzed", detail: "Request a Deep Scan for evidence" };
}
