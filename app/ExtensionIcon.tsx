"use client";

import { useState } from "react";

type Props = {
  iconUrl?: string | null;
  publisher: string;
  name?: string;
  size?: "sm" | "md" | "lg";
};

export default function ExtensionIcon({ iconUrl, publisher, name = "", size = "md" }: Props) {
  const [failed, setFailed] = useState(false);
  const initials = (publisher || name || "EX").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "EX";
  return <span className={`extensionIcon extensionIcon-${size}`} aria-hidden="true">
    {iconUrl && !failed ? <img src={iconUrl} alt="" onError={() => setFailed(true)} /> : <span>{initials}</span>}
  </span>;
}
