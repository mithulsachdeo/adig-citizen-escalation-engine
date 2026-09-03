"use client";
import React, { useEffect, useState } from "react";

// Session-gated brand reveal (impeccable /animate). Analogue to mindmarket's logo-draw preloader:
// a lightning bolt strikes across → the A-bolt monogram charges up → a green panel wipes up to reveal
// the (green-hero) page. ~1.1s, skippable, first-visit-per-session only, off under reduced-motion.
//
// STRICT sequence (curtain → page, never page → curtain): the overlay is rendered in the INITIAL HTML
// (default state, server-rendered) so it covers the page from the very first paint — no landing-page
// flash. A pre-paint inline script in the layout sets html[data-adig-intro="skip"] for repeat/reduced
// visitors, and CSS hides the overlay for them before it could flash. This component then removes the
// overlay after the animation (or on skip); repeat/reduced visitors are resolved to `done` on mount.

const SEEN_KEY = "adig_intro_seen";
const TOTAL_MS = 1320;

export function IntroCurtain() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let play = true;
    try {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || sessionStorage.getItem(SEEN_KEY)) play = false;
    } catch {
      /* sessionStorage/matchMedia unavailable — fall through and play once */
    }
    if (!play) {
      setDone(true);
      return;
    }
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setDone(true), TOTAL_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div className="adig-intro" role="presentation" onClick={() => setDone(true)}>
      <svg className="adig-intro__bolt" viewBox="0 0 100 100" aria-hidden="true">
        {/* a single lightning stroke that draws itself across the frame */}
        <path pathLength={1} d="M64 6 L40 46 L56 46 L36 94" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="adig-intro__mark" src="/logo-primary.svg" alt="" aria-hidden="true" />
      <span className="adig-intro__flash" aria-hidden="true" />
      <span className="adig-intro__wipe" aria-hidden="true" />
      <button
        type="button"
        className="adig-intro__skip"
        onClick={(e) => {
          e.stopPropagation();
          setDone(true);
        }}
      >
        Skip
      </button>
    </div>
  );
}
