import React from "react";

// Addendum §1: verified/draft trust badge. Icon + text label ALWAYS — never color alone.
// `verified` = primary-source-checked by us, NOT lawyer-confirmed.
export type Confidence = "verified" | "draft";

export function Badge({ variant, children }: { variant: Confidence; children?: React.ReactNode }) {
  const verified = variant === "verified";
  const label = children ?? (verified ? "Verified" : "Draft — confirm before sending");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "var(--radius-pill)",
        font: "var(--text-small)",
        fontWeight: 700,
        background: verified ? "var(--badge-verified-bg)" : "var(--badge-draft-bg)",
        color: verified ? "var(--badge-verified-ink)" : "var(--badge-draft-ink)",
        // draft reads as provisional even in greyscale (dashed border)
        border: verified ? "1.5px solid transparent" : "1.5px dashed var(--severity-mid)",
      }}
    >
      {/* screen-reader prefix so it reads "Status: Draft, confirm before sending" */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Status: </span>
      <span aria-hidden="true">{verified ? "✓" : "✎"}</span>
      {label}
    </span>
  );
}
