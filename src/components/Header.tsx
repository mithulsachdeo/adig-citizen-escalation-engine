import React from "react";

// Light UI → ink mark (addendum §7 colourway rule). Logo is decorative; wordmark carries the name.
export function Header() {
  return (
    <header
      className="app-chrome"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 0",
      }}
    >
      <div className="adig-container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mono.svg" alt="" width={36} height={36} aria-hidden="true" />
        <span style={{ font: "var(--text-h3)", fontWeight: 700, letterSpacing: "-0.01em" }}>
          Adig
          <span style={{ font: "var(--text-small)", fontWeight: 500, color: "var(--ink-faint)", marginInlineStart: 8 }}>
            अडिग
          </span>
        </span>
      </div>
    </header>
  );
}
