"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  iconUrl?: string | null;
  publisher: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "logo";
};

export default function ExtensionIcon({
  iconUrl,
  publisher,
  name = "",
  size = "md",
}: Props) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const [loadedIcon, setLoadedIcon] = useState<string | null>(null);
  const initials =
    (publisher || name || "EX")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase() || "EX";
  return (
    <span className={`extensionIcon extensionIcon-${size}`} aria-hidden="true">
      <span className="extensionIconFallback">{initials}</span>
      {iconUrl && failedIcon !== iconUrl ? (
        <Image
          key={iconUrl}
          className={loadedIcon === iconUrl ? "isLoaded" : ""}
          src={iconUrl}
          alt=""
          fill
          sizes={size === "lg" ? "80px" : "56px"}
          preload={size === "lg"}
          unoptimized
          decoding="async"
          onLoad={() => setLoadedIcon(iconUrl)}
          onError={() => setFailedIcon(iconUrl)}
        />
      ) : null}
    </span>
  );
}
