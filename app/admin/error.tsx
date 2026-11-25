"use client";
export default function AdminError({ reset }: { reset: () => void }) { return <main className="adminPage"><h1>Dashboard unavailable</h1><p>Access or database verification could not complete. No private data has been displayed.</p><button className="adminPrimary" onClick={reset}>Try again</button></main>; }
