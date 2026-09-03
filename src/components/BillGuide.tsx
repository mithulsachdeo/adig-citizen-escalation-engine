"use client";
// Collapsible "where is this on my bill?" helper shown on the intake screen. A redacted sample MSEDCL
// bill with numbered markers over the fields the tool asks for, plus a legend. Static image (no PII,
// no upload, on-device) — it just teaches the citizen where to read each value on their own bill.

import React, { useState } from "react";
import { useT } from "@/i18n/context";

// Marker positions as % of the sample image (public/bill-sample.png). Keyed to billGuide.legend.*.
// Numbered in FORM order (the order the citizen fills the fields), so field ③ ↔ bill ③.
const MARKERS: { n: number; key: string; x: number; y: number }[] = [
  { n: 1, key: "units", x: 41, y: 47 },
  { n: 2, key: "period", x: 64, y: 36.5 },
  { n: 3, key: "amount", x: 90, y: 16 },
  { n: 4, key: "reading", x: 8, y: 52 },
  { n: 5, key: "category", x: 30, y: 31 },
  { n: 6, key: "circle", x: 27, y: 28.5 },
  { n: 7, key: "priorAvg", x: 64, y: 65 },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"
      style={{ transition: "transform 0.18s ease", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}>
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BillGuide() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="adig-billguide">
      <button
        type="button"
        className="adig-billguide__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Chevron open={open} />
        {t("billGuide.toggle")}
      </button>

      {open && (
        <div className="adig-billguide__body">
          <p className="adig-billguide__intro">{t("billGuide.intro")}</p>

          <figure className="adig-billguide__figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bill-sample.png" alt={t("billGuide.caption")} className="adig-billguide__img" />
            {MARKERS.map((m) => (
              <span
                key={m.n}
                className="adig-billguide__marker"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                aria-hidden="true"
              >
                {m.n}
              </span>
            ))}
          </figure>

          <ol className="adig-billguide__legend">
            {MARKERS.map((m) => (
              <li key={m.n} className="adig-billguide__item">
                <span className="adig-billguide__num">{m.n}</span>
                <span>{t(`billGuide.legend.${m.key}`)}</span>
              </li>
            ))}
          </ol>

          <p className="adig-billguide__note">{t("billGuide.note")}</p>
        </div>
      )}
    </div>
  );
}

export default BillGuide;
