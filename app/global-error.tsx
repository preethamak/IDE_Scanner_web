"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f4f5f0", color: "#101713", margin: 0 }}>
        <main style={{ maxWidth: "40rem", margin: "0 auto", padding: "6rem 1.5rem" }}>
          <h1>GuardRails hit an unexpected error.</h1>
          <p>The page could not be rendered. Reload to try again.</p>
          <button type="button" onClick={reset}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
