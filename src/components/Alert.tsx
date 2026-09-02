import React from "react";

type Tone = "info" | "warning" | "danger";

// Addendum §2: tone carries an icon + text, never color alone.
const MAP: Record<Tone, { bg: string; ink: string; dot: string; icon: string; role: "status" | "alert" }> = {
  info: { bg: "var(--brand-green-wash)", ink: "var(--brand-green-ink)", dot: "var(--brand-green)", icon: "ℹ", role: "status" },
  warning: { bg: "oklch(93% 0.05 55)", ink: "var(--severity-mid)", dot: "var(--accent-yellow)", icon: "⚠", role: "status" },
  danger: { bg: "var(--severity-high-wash)", ink: "var(--severity-high)", dot: "var(--accent-coral)", icon: "⚠", role: "alert" },
};

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  const m = MAP[tone];
  return (
    <div
      role={m.role}
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        background: m.bg,
        borderRadius: "var(--radius-md)",
        padding: "20px 24px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: m.dot,
          color: "var(--ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: "var(--text-small)",
          fontWeight: 700,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {m.icon}
      </span>
      <div>
        {title && <div style={{ font: "var(--text-h3)", color: m.ink, marginBottom: 4 }}>{title}</div>}
        <div style={{ font: "var(--text-body)", color: "var(--ink-soft)" }}>{children}</div>
      </div>
    </div>
  );
}
