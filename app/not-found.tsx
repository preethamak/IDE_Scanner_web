import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" style={{ maxWidth: "40rem", margin: "0 auto", padding: "6rem 1.5rem" }}>
      <h1>Page not found.</h1>
      <p>
        This address does not match a catalog page, extension, or report. The
        extension catalog is the fastest way back to version-specific evidence.
      </p>
      <p>
        <Link href="/">Go to the homepage</Link> or{" "}
        <Link href="/extensions">browse the extension catalog</Link>.
      </p>
    </main>
  );
}
