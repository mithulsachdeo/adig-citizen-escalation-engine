"use client";
import React, { useEffect, useRef, useState } from "react";
import type { MascotExpression, MascotReaction } from "./Mascot";

// Rigged, vector version of the mascot (impeccable /animate, Q5=C "earn its place" candidate).
// A flat geometric "electric-man" authored as SVG so its LIMBS actually move — breathing torso,
// swaying arm, a waving arm on happy/helping, and a flickering bolt — which the flat PNG can't do.
// Reuses the .adig-mascot wrapper for entrance + idle-float + the reveal beat (hop/tilt); the internal
// limb motion is gated by .rm--live (in view, motion allowed). Same props as <Mascot> so it's a drop-in.

const BEAT_MS = 720;

function Mouth({ expression }: { expression: MascotExpression }) {
  const stroke = { fill: "none", stroke: "var(--ink)", strokeWidth: 2.6, strokeLinecap: "round" as const };
  if (expression === "happy" || expression === "helping") return <path d="M51 47 Q60 57 69 47" {...stroke} />;
  if (expression === "sad") return <path d="M51 53 Q60 45 69 53" {...stroke} />;
  return <path d="M52 50 H68" {...stroke} />;
}

export function RiggedMascot({
  expression,
  size = 140,
  reaction = "none",
  alt = "",
}: {
  expression: MascotExpression;
  size?: number;
  reaction?: MascotReaction;
  alt?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<"pre" | "enter" | "idle">("pre");
  const [beat, setBeat] = useState<MascotReaction>("none");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (inView && phase === "pre") setPhase(reduced ? "idle" : "enter");
  }, [inView, phase, reduced]);

  useEffect(() => {
    if (reduced || reaction === "none" || !inView) return;
    setBeat(reaction);
    const t = setTimeout(() => setBeat("none"), BEAT_MS);
    return () => clearTimeout(t);
  }, [reaction, inView, reduced, expression]);

  const live = inView && !reduced && phase !== "pre";
  const svgClass = [
    "adig-mascot__img",
    "rm",
    phase === "enter" ? "is-enter" : "",
    phase === "idle" && inView && !reduced ? "is-idle" : "",
    live ? "rm--live" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const beatClass = beat === "hop" ? "is-hop" : beat === "tilt" ? "is-tilt" : "";

  return (
    <span
      ref={wrapRef}
      className="adig-mascot mascot"
      style={{ width: size, height: size }}
      onAnimationEnd={() => {
        if (phase === "enter") setPhase("idle");
      }}
    >
      <span className={["adig-mascot__beat", beatClass].filter(Boolean).join(" ")}>
        <svg
          className={svgClass}
          data-exp={expression}
          width={size}
          height={size}
          viewBox="0 0 120 160"
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt === "" ? true : undefined}
        >
          {/* feet + legs */}
          <ellipse cx="49" cy="147" rx="11" ry="6" fill="var(--accent-yellow)" />
          <ellipse cx="71" cy="147" rx="11" ry="6" fill="var(--accent-yellow)" />
          <rect x="45" y="104" width="10" height="40" rx="5" fill="var(--accent-blue)" />
          <rect x="65" y="104" width="10" height="40" rx="5" fill="var(--accent-blue)" />

          {/* torso: body + head + face + arms + bolt (breathes as a group) */}
          <g className="rm-torso">
            <rect x="38" y="58" width="44" height="54" rx="18" fill="var(--brand-green)" stroke="var(--brand-green-ink)" strokeWidth="2" />
            {/* belly bolt emblem */}
            <path d="M62 70 L54 84 L60 84 L56 96 L68 80 L61 80 Z" fill="var(--accent-yellow)" />
            <circle cx="60" cy="40" r="22" fill="var(--brand-green)" stroke="var(--brand-green-ink)" strokeWidth="2" />
            <circle cx="52" cy="40" r="3" fill="var(--ink)" />
            <circle cx="68" cy="40" r="3" fill="var(--ink)" />
            <Mouth expression={expression} />

            {/* left arm sways with idle */}
            <path className="rm-arm-l" d="M42 66 Q33 80 33 97" fill="none" stroke="var(--accent-coral)" strokeWidth="10" strokeLinecap="round" />

            {/* right arm — waves on happy/helping — holding the bolt */}
            <g className="rm-arm-r">
              <path d="M78 66 Q90 54 97 44" fill="none" stroke="var(--accent-coral)" strokeWidth="10" strokeLinecap="round" />
              <path className="rm-bolt" d="M102 28 L92 46 L100 46 L90 64" fill="none" stroke="var(--accent-yellow)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </svg>
      </span>
    </span>
  );
}
