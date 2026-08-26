"use client";

import { useState } from "react";

export default function BadgeBuilder({ origin }: { origin: string }) {
  const [extensionId, setExtensionId] = useState("");
  const valid = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extensionId.trim());
  const badgeUrl = `${origin}/api/badge?extension=${encodeURIComponent(extensionId.trim())}`;
  const pageUrl = `${origin}/extensions/${encodeURIComponent(extensionId.trim())}`;
  const markdown = `[![GuardRails analysis](${badgeUrl})](${pageUrl})`;
  const html = `<a href="${pageUrl}"><img src="${badgeUrl}" alt="Analyzed by GuardRails" width="240" height="20"></a>`;

  return (
    <div>
      <label htmlFor="badge-extension">Extension ID</label>
      <input
        id="badge-extension"
        value={extensionId}
        onChange={(event) => setExtensionId(event.target.value)}
        placeholder="publisher.extension-name"
        spellCheck={false}
      />
      {valid ? (
        <>
          <p>
            Live preview —{" "}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt={`GuardRails badge for ${extensionId}`} height={20} />
          </p>
          <h3>Markdown (README.md)</h3>
          <pre>{markdown}</pre>
          <h3>HTML</h3>
          <pre>{html}</pre>
          <button type="button" onClick={() => void navigator.clipboard.writeText(markdown)}>
            Copy Markdown
          </button>{" "}
          <button type="button" onClick={() => void navigator.clipboard.writeText(html)}>
            Copy HTML
          </button>
        </>
      ) : (
        <p>Enter an extension ID like <code>publisher.extension-name</code> to generate your embed snippet.</p>
      )}
    </div>
  );
}
