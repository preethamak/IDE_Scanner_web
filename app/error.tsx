"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" style={{ maxWidth: "40rem", margin: "0 auto", padding: "6rem 1.5rem" }}>
      <h1>Something went wrong.</h1>
      <p>
        This page could not be rendered. No security decision is implied by this
        failure; the underlying evidence is unchanged.
      </p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
