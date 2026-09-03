import React from "react";
import Link from "next/link";

// Light UI → ink mark (addendum §7 colourway rule). Logo is decorative; wordmark carries the name.
export function Header() {
  return (
    <header className="app-chrome adig-masthead">
      <div className="adig-wide">
        {/* The whole lockup links home. */}
        <Link
          href="/"
          aria-label="Adig — home"
          style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-primary.svg" alt="" width={40} height={40} aria-hidden="true" />
          {/* Wordmark + tagline, matching the full-lockup asset (05-adig-full-lockup) in the light-UI ink colourway. */}
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ font: "var(--text-h3)", fontWeight: 700, letterSpacing: "-0.01em" }}>
            Adig
            <span style={{ font: "var(--text-small)", fontWeight: 500, color: "var(--ink-faint)", marginInlineStart: 8 }}>
              अडिग
            </span>
          </span>
          <span
            style={{
              marginTop: 4,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "var(--ink-faint)",
              whiteSpace: "nowrap",
            }}
          >
            Assess · Dispute · Inform · Get Redress
          </span>
        </span>
        </Link>
      </div>
    </header>
  );
}
