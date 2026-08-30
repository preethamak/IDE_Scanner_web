"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  extensionIconCandidates,
  extensionInitials,
} from "@/lib/extensionIconUrl";

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
  const candidates = useMemo(() => extensionIconCandidates(iconUrl), [iconUrl]);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [loadedSource, setLoadedSource] = useState("");
  const initials = extensionInitials(publisher, name);
  const source = candidates.find(
    (candidate) => !failedSources.includes(candidate),
  );
  return (
    <span className={`extensionIcon extensionIcon-${size}`} aria-hidden="true">
      <span className="extensionIconFallback">{initials}</span>
      {source ? (
        <Image
          key={source}
          className={loadedSource === source ? "isLoaded" : ""}
          src={source}
          alt=""
          fill
          sizes={size === "lg" ? "80px" : "56px"}
          priority={size === "logo"}
          unoptimized
          decoding="async"
          onLoad={() => setLoadedSource(source)}
          onError={() => {
            setLoadedSource("");
            setFailedSources((current) =>
              current.includes(source) ? current : [...current, source],
            );
          }}
        />
      ) : null}
    </span>
  );
}
