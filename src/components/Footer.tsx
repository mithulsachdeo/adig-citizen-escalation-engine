import React from "react";

// Trust / legal footer (T9). Shown on every page. Two load-bearing statements:
//   1. Self-help disclaimer — Adig is not legal advice (mirrors the disclaimer on every instrument).
//   2. A precise privacy statement — store-nothing, and the one exception (the narrative going to the
//      AI provider) stated plainly, so the citizen knows exactly what leaves the device.
// `app-chrome` marks it non-document chrome so the print stylesheet (addendum §4) hides it.
export function Footer() {
  return (
    <footer
      className="adig-container app-chrome"
      style={{
        paddingBlock: "var(--space-7)",
        borderTop: "1px solid var(--line)",
        marginTop: "var(--space-6)",
      }}
    >
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>
          <strong style={{ color: "var(--ink-soft)" }}>Adig is a self-help tool, not legal advice.</strong>{" "}
          Using it does not create a lawyer–client relationship. Overcharge figures are estimates based
          on the standard monthly pro-rata rule (MERC Supply Code 2021, Regulation 16.1.1) — not a final
          legal determination. Review every detail and confirm the current forum contact before you send
          anything.
        </p>
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>
          <strong style={{ color: "var(--ink-soft)" }}>Your privacy:</strong> we store nothing you enter.
          Your bill details stay on your device. The only thing that leaves it is the short description
          you choose to write, which is sent to our AI provider solely to draft one plain-language
          paragraph and is not retained. We keep no account and record only anonymous, non-identifying
          usage counts.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
