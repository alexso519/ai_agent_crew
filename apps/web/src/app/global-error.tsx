"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0d1117] text-white">
        <div style={{ padding: 48, fontFamily: "system-ui, sans-serif" }}>
          <h2>Critical error</h2>
          <p style={{ opacity: 0.8 }}>{error.message}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#3b82f6",
              border: "none",
              borderRadius: 6,
              color: "white",
              cursor: "pointer",
            }}
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
