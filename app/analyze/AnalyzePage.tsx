"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileArchive,
  HardDrive,
  LoaderCircle,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { parseReportBundle, saveImportedReport } from "@/lib/reportBundle";
import styles from "./analyze.module.css";

export default function AnalyzePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  async function importReport(file: File | null) {
    if (!file || importing) return;
    setMessage(null);
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setMessage({
        tone: "error",
        text: "Choose a GuardRails report.zip bundle.",
      });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setMessage({
        tone: "error",
        text: "This report is larger than the 100 MB browser import limit.",
      });
      return;
    }
    setImporting(true);
    try {
      const bundle = await parseReportBundle(file);
      saveImportedReport(bundle);
      setMessage({
        tone: "success",
        text: "Report verified. Opening its exact evidence…",
      });
      router.push(`/reports/${encodeURIComponent(bundle.id)}`);
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error
            ? cause.message
            : "This report could not be verified.",
      });
      setImporting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          <ShieldCheck /> Choose the evidence boundary
        </span>
        <h1>
          Start with what
          <br />
          <em>you actually have.</em>
        </h1>
        <p>
          A published extension, an installed editor, and a portable report need
          different workflows. GuardRails keeps those boundaries explicit
          instead of pretending a browser can inspect everything.
        </p>
      </section>

      <section className={styles.paths} aria-label="Analysis options">
        <article className={styles.primaryPath}>
          <span className={styles.pathIcon}>
            <Search />
          </span>
          <small>Before installation</small>
          <h2>Find a published extension.</h2>
          <p>
            Search Visual Studio Marketplace and Open VSX, inspect the latest
            analyzed release, then compare permissions before an update reaches
            your editor.
          </p>
          <ul>
            <li>
              <CheckCircle2 /> Exact marketplace version
            </li>
            <li>
              <CheckCircle2 /> Permission Passport
            </li>
            <li>
              <CheckCircle2 /> Deep Scan evidence
            </li>
          </ul>
          <Link href="/registry">
            Search the Extension Registry <ArrowRight />
          </Link>
        </article>

        <article>
          <span className={styles.pathIcon}>
            <HardDrive />
          </span>
          <small>Already installed</small>
          <h2>Audit your local editors.</h2>
          <p>
            The GuardRails CLI finds extensions across supported editors and
            inspects local snapshots without uploading their source.
          </p>
          <Link href="/cli">
            Open the CLI guide <ArrowRight />
          </Link>
        </article>

        <article>
          <span className={styles.pathIcon}>
            <FileArchive />
          </span>
          <small>Portable evidence</small>
          <h2>Open a report privately.</h2>
          <p>
            Import a canonical report.zip in this browser. Its files remain on
            this device and the recorded decision is not recalculated.
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            <Upload /> {importing ? "Verifying report…" : "Choose report.zip"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              event.target.value = "";
              void importReport(file);
            }}
          />
        </article>
      </section>

      <section
        className={`${styles.dropZone} ${dragging ? styles.dragging : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void importReport(event.dataTransfer.files?.[0] || null);
        }}
      >
        <span>
          {importing ? (
            <LoaderCircle className={styles.spin} />
          ) : (
            <FileArchive />
          )}
        </span>
        <div>
          <strong>
            {dragging
              ? "Drop the report to verify it"
              : "Already have a GuardRails report?"}
          </strong>
          <p>
            Drop report.zip here or choose it from your device. Nothing is
            uploaded.
          </p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={importing}>
          Browse files
        </button>
      </section>

      {message ? (
        <div
          className={`${styles.message} ${styles[message.tone]}`}
          role="status"
        >
          {message.tone === "success" ? <CheckCircle2 /> : <XCircle />}
          <span>{message.text}</span>
        </div>
      ) : null}

      <section className={styles.boundary}>
        <div>
          <span>Clear by design</span>
          <h2>No misleading “upload and scan” promise.</h2>
        </div>
        <p>
          A website cannot enumerate installed extensions, and a lightweight
          browser preview is not a security decision. Published packages use
          Deep Scan; installed packages use the local CLI; portable evidence
          uses the report importer.
        </p>
      </section>
    </main>
  );
}
