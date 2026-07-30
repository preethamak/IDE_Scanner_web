"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  iconUrl?: string | null;
  publisher: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "logo";
};

export default function ExtensionIcon({ iconUrl, publisher, name = "", size = "md" }: Props) {
  const [failed, setFailed] = useState(false);
  const initials = (publisher || name || "EX").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "EX";
  return <span className={`extensionIcon extensionIcon-${size}`} aria-hidden="true">
    {iconUrl && !failed ? <Image src={iconUrl} alt="" fill sizes="56px" unoptimized onError={() => setFailed(true)} /> : <span>{initials}</span>}
  </span>;
}
