"use client";
import React, { useEffect, useRef, useState } from "react";

// The Adig "electric man" mascot, brought to life (impeccable /animate).
// Layers, all CSS transform/opacity so it stays smooth on low-end Android:
//   1. Entrance — a one-time fade + gentle scale-overshoot when it scrolls into view.
//   2. Idle     — a calm float loop + a sparse bolt-spark glow (the electric-bolt motif).
//                 The loop is nonessential, so it PAUSES when offscreen (a11y).
//   3. Reactive — a reveal beat (`hop` for relief, `tilt` for concern) that reflects a result.
//   4. Crossfade between the four expression PNGs on state change.
// prefers-reduced-motion freezes all of it to the correct static expression.

export type MascotExpression = "neutral" | "happy" | "sad" | "helping";
export type MascotReaction = "hop" | "tilt" | "none";

const SRC: Record<MascotExpression, string> = {
  neutral: "/mascot/mascot-neutral.png",
  happy: "/mascot/mascot-happy.png",
  sad: "/mascot/mascot-sad.png",
  helping: "/mascot/mascot-helping.png",
};

const CROSSFADE_MS = 220;
const BEAT_MS = 720;

export function Mascot({
  expression,
  size = 140,
  reaction = "none",
  alt = "",
  spark = true,
  className,
}: {
  expression: MascotExpression;
  size?: number;
  /** A one-time reveal beat reflecting a result. Retriggers whenever it changes to a non-"none" value. */
  reaction?: MascotReaction;
  /** Meaningful description for content mascots; leave "" for decorative ones (marks it aria-hidden). */
  alt?: string;
  spark?: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<"pre" | "enter" | "idle">("pre");
  const [src, setSrc] = useState(SRC[expression]);
  const [fading, setFading] = useState(false);
  const [beat, setBeat] = useState<MascotReaction>("none");

  // Reduced-motion preference (client only).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Enter / pause on visibility.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Trigger the entrance the first time it comes into view.
  useEffect(() => {
    if (inView && phase === "pre") setPhase(reduced ? "idle" : "enter");
  }, [inView, phase, reduced]);

  // Crossfade to a new expression.
  useEffect(() => {
    const next = SRC[expression];
    if (next === src) return;
    if (reduced) {
      setSrc(next);
      return;
    }
    setFading(true);
    const t = setTimeout(() => {
      setSrc(next);
      setFading(false);
    }, CROSSFADE_MS);
    return () => clearTimeout(t);
  }, [expression, src, reduced]);

  // Play the reveal beat once the mascot is in view (and again if the reaction changes).
  useEffect(() => {
    if (reduced || reaction === "none" || !inView) return;
    setBeat(reaction);
    const t = setTimeout(() => setBeat("none"), BEAT_MS);
    return () => clearTimeout(t);
  }, [reaction, inView, reduced, expression]);

  const imgClass = [
    "adig-mascot__img",
    phase === "enter" ? "is-enter" : "",
    phase === "idle" && inView && !reduced ? "is-idle" : "",
    fading ? "is-fading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const beatClass = beat === "hop" ? "is-hop" : beat === "tilt" ? "is-tilt" : "";

  return (
    <span
      ref={wrapRef}
      className={["adig-mascot", "mascot", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    >
      {spark && !reduced && inView && <span aria-hidden="true" className="adig-mascot__spark" />}
      <span className={["adig-mascot__beat", beatClass].filter(Boolean).join(" ")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={imgClass}
          src={src}
          width={size}
          height={size}
          alt={alt}
          aria-hidden={alt === "" ? true : undefined}
          onAnimationEnd={() => {
            if (phase === "enter") setPhase("idle");
          }}
        />
      </span>
    </span>
  );
}
