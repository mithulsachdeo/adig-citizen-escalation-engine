import React from "react";

export type CostItem = { label: string; amount: number };

// Addendum §6: overcharge is an estimate that cites the rule; caption carries the caveat.
// en-IN grouping (₹4,200). ₹ column right-aligned, never truncated (addendum §3).
export function CostBreakdown({
  items,
  total,
  label = "Likely overcharge",
  caption,
}: {
  items: CostItem[];
  total: number;
  label?: string;
  caption?: string;
}) {
  return (
    <div style={{ background: "var(--canvas-raised)", borderRadius: "var(--radius-md)", padding: "24px 28px", border: "1px solid var(--line)" }}>
      {items.map((it) => (
        <div
          key={it.label}
          style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--line)", font: "var(--text-body)", color: "var(--ink-soft)" }}
        >
          <span>{it.label}</span>
          <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>₹{it.amount.toLocaleString("en-IN")}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingTop: 16, font: "var(--text-h2)", color: "var(--ink)" }}>
        <span>{label}</span>
        <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>₹{total.toLocaleString("en-IN")}</span>
      </div>
      {caption && (
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginTop: 12 }}>{caption}</p>
      )}
    </div>
  );
}
