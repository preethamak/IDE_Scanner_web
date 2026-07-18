"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

/* Renders extension README markdown safely. marked -> DOMPurify sanitize.
   DOMPurify is browser-only, so this stays a client component. */
export default function Markdown({ source }: { source: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(source, { async: false }) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ["target"] });
  }, [source]);
  return <div className="ds-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
