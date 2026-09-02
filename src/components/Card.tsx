import React from "react";

type Accent = "green" | "blue" | "coral" | "yellow" | "pink";

export function Card({
  eyebrow,
  title,
  children,
  accent = "green",
  lift,
}: {
  eyebrow?: string;
  title?: string;
  children?: React.ReactNode;
  accent?: Accent;
  lift?: boolean;
}) {
  const dot: Record<Accent, string> = {
    green: "var(--brand-green)",
    blue: "var(--accent-blue)",
    coral: "var(--accent-coral)",
    yellow: "var(--accent-yellow)",
    pink: "var(--accent-pink)",
  };
  return (
    <div
      className={lift ? "adig-sticker-lift" : undefined}
      style={{
        background: "var(--white)",
        borderRadius: "var(--radius-lg)",
        padding: "28px 32px",
        boxShadow: "var(--shadow-raised)",
      }}
    >
      {eyebrow && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: dot[accent] }} />
          <span style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {eyebrow}
          </span>
        </div>
      )}
      {title && <div style={{ font: "var(--text-h2)", color: "var(--ink)", marginBottom: 10 }}>{title}</div>}
      <div style={{ font: "var(--text-body)", color: "var(--ink-soft)" }}>{children}</div>
    </div>
  );
}
