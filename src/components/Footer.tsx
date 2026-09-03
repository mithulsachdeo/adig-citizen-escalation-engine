"use client";
import React from "react";
import { useT } from "@/i18n/context";

// Trust / legal footer (T9). Shown on every page. Two load-bearing statements:
//   1. Self-help disclaimer — Adig is not legal advice (mirrors the disclaimer on every instrument).
//   2. A precise privacy statement — store-nothing, and the one exception (the narrative going to the
//      AI provider) stated plainly, so the citizen knows exactly what leaves the device.
// `app-chrome` marks it non-document chrome so the print stylesheet (addendum §4) hides it.
export function Footer() {
  const t = useT();
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
          <strong style={{ color: "var(--ink-soft)" }}>{t("footer.disclaimerStrong")}</strong>
          {t("footer.disclaimerBody")}
        </p>
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>
          <strong style={{ color: "var(--ink-soft)" }}>{t("footer.privacyStrong")}</strong>
          {t("footer.privacyBody")}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
