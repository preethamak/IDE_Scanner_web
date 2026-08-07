"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import {
  extensionIconCandidates,
  extensionInitials,
} from "@/lib/extensionIconUrl";

type Props = {
  id: string;
  name?: string | null;
  version?: string | null;
  iconUrl?: string | null;
  publisher?: string | null;
  verified?: boolean;
  eyebrow?: string;
  size?: "sm" | "md" | "lg";
};

/* The one true extension identity. Icon with initials fallback, a name that
   truncates instead of colliding with siblings, an optional verified badge,
   and a consistent `id@version` line. Use this everywhere an extension is named. */
export default function ExtensionIdentity({
  id,
  name,
  version,
  iconUrl,
  publisher,
  verified,
  eyebrow,
  size = "md",
}: Props) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const candidates = extensionIconCandidates(iconUrl);
  const source = candidates.find(
    (candidate) => !failedSources.includes(candidate),
  );
  const initials = extensionInitials(publisher || id, name || "");
  const displayName = name || id;
  return (
    <div className={`xid xid-${size}`}>
      <span className="xid-icon" aria-hidden="true">
        {source ? (
          <Image
            key={source}
            src={source}
            alt=""
            fill
            sizes="64px"
            unoptimized
            decoding="async"
            onError={() =>
              setFailedSources((current) =>
                current.includes(source) ? current : [...current, source],
              )
            }
          />
        ) : (
          initials
        )}
      </span>
      <div className="xid-body">
        {eyebrow ? <span className="xid-eyebrow">{eyebrow}</span> : null}
        <p className="xid-name">
          <span>{displayName}</span>
          {verified ? (
            <BadgeCheck
              className="xid-verified"
              aria-label="Verified Marketplace publisher"
            />
          ) : null}
        </p>
        <code className="xid-id">
          <b>{id}</b>
          {version ? `@${version}` : ""}
        </code>
      </div>
    </div>
  );
}
