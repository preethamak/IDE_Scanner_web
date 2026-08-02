"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  iconUrl?: string | null;
  publisher: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "logo";
};

export default function ExtensionIcon({ iconUrl, publisher, name = "", size = "md" }: Props) {
  const [failed, setFailed] = useState(false);
  const [loadedIcon, setLoadedIcon] = useState<string | null>(null);
  const initials = (publisher || name || "EX").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "EX";
  useEffect(() => { setFailed(false); setLoadedIcon(null); }, [iconUrl]);
  return <span className={`extensionIcon extensionIcon-${size}`} aria-hidden="true">
    <span className="extensionIconFallback">{initials}</span>
    {iconUrl && !failed ? <Image key={iconUrl} className={loadedIcon === iconUrl ? "isLoaded" : ""} src={iconUrl} alt="" fill sizes="56px" unoptimized onLoad={() => setLoadedIcon(iconUrl)} onError={() => setFailed(true)} /> : null}
  </span>;
}
