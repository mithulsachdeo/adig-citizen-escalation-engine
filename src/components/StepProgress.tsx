import React from "react";

// design.md: 5-step tracker Diagnose → Calculate → Evidence → Document → Submit.
export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div
      role="list"
      aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
    >
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div role="listitem" aria-current={i === current ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "var(--text-small)",
                fontWeight: 700,
                background: i <= current ? "var(--brand-green)" : "var(--white)",
                color: i <= current ? "var(--ink)" : "var(--ink-faint)",
                border: i <= current ? "none" : "2px solid var(--line)",
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                font: "var(--text-small)",
                fontWeight: i === current ? 700 : 500,
                color: i === current ? "var(--ink)" : "var(--ink-faint)",
              }}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span aria-hidden="true" style={{ width: 24, height: 2, background: i < current ? "var(--brand-green)" : "var(--line)" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
