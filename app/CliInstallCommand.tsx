"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CliInstallCommand() {
  const [copied, setCopied] = useState(false);
  const command = "pipx install guardlens";

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <div className="cliInstallCommand">
    <code><span>$</span> {command}</code>
    <button type="button" onClick={copyCommand} aria-label="Copy installation command">
      {copied ? <Check /> : <Copy />}<span>{copied ? "Copied" : "Copy"}</span>
    </button>
  </div>;
}
