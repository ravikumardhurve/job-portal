"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en-IN"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", background: "#f8fbf9", color: "#1e2b26" }}><div style={{ maxWidth: 520, textAlign: "center" }}><h1>CG Job Care is temporarily unavailable</h1><p>Please check your connection and try again.</p><button type="button" onClick={reset} style={{ marginTop: 16, border: 0, borderRadius: 8, padding: "12px 18px", background: "#157a4a", color: "white", fontWeight: 700 }}>Try again</button></div></main></body></html>;
}
