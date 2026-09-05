"use client";
import React, { useEffect, useRef, useState, useId } from "react";
import { gsap } from "gsap";

export type MascotExpression = "neutral" | "happy" | "sad" | "helping";
export type MascotReaction = "hop" | "tilt" | "none";

export interface MascotProps {
  expression: MascotExpression;
  size?: number; // default 140
  reaction?: MascotReaction; // one-time reveal beat; default "none"
  alt?: string; // "" => decorative => aria-hidden
  spark?: boolean; // optional, default true
  className?: string;
}

const SVGNS = "http://www.w3.org/2000/svg";

export function Mascot({
  expression,
  size = 140,
  reaction = "none",
  alt = "",
  spark = true,
  className,
}: MascotProps) {
  const rawId = useId();
  const uid = "m-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  // Scoped IDs for defs and url(#...) references to prevent collision across instances
  const boltGlowId = `${uid}-bolt-glow`;
  const bodyShadowId = `${uid}-body-shadow`;
  const suitGradId = `${uid}-suit-grad`;
  const boltGradId = `${uid}-bolt-grad`;

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyGroupRef = useRef<SVGGElement>(null);
  const rightArmRef = useRef<SVGGElement>(null);
  const leftArmRef = useRef<SVGGElement>(null);
  const boltRef = useRef<SVGGElement>(null);
  const capeRef = useRef<SVGPathElement>(null);
  const headGroupRef = useRef<SVGGElement>(null);
  const eyeLeftRef = useRef<SVGElement>(null);
  const eyeRightRef = useRef<SVGElement>(null);
  const chargeRingRef = useRef<SVGCircleElement>(null);
  const tearRef = useRef<SVGPathElement>(null);
  const sparkleLayerRef = useRef<SVGGElement>(null);

  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hasEnteredRef = useRef(false);

  // Handlers stored in refs so React event props trigger the current emotion's logic
  const handleMouseEnterRef = useRef<() => void>(() => {});
  const handleMouseLeaveRef = useRef<() => void>(() => {});
  const handleClickRef = useRef<() => void>(() => {});

  // 1. Reduced motion check
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 2. IntersectionObserver (threshold 0.35) for offscreen pause & first entrance
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 3. GSAP Animation lifecycle scoped via gsap.context
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = svgRef.current;
    const bodyGroup = bodyGroupRef.current;
    const rightArm = rightArmRef.current;
    const leftArm = leftArmRef.current;
    const bolt = boltRef.current;
    const cape = capeRef.current;
    const headGroup = headGroupRef.current;
    const eyeLeft = eyeLeftRef.current;
    const eyeRight = eyeRightRef.current;
    const chargeRing = chargeRingRef.current;
    const tear = tearRef.current;
    const sparkleLayer = sparkleLayerRef.current;

    if (!wrapper || !svg || !bodyGroup || !rightArm || !bolt || !cape || !headGroup) {
      return;
    }

    const ctx = gsap.context(() => {
      // Set initial transform origins matching reference prototypes
      gsap.set(wrapper, { transformOrigin: "center bottom" });
      gsap.set(bodyGroup, { transformOrigin: "50% 100%" });
      gsap.set(headGroup, { transformOrigin: "140px 140px" });
      gsap.set(bolt, { transformOrigin: "center center" });

      if (expression === "sad") {
        gsap.set(rightArm, { transformOrigin: "30% 20%" });
        gsap.set(cape, { transformOrigin: "140px 122px" });
      } else {
        gsap.set(rightArm, { transformOrigin: "30% 90%" });
        gsap.set(cape, { transformOrigin: "140px 120px" });
      }

      if (leftArm && expression === "happy") {
        gsap.set(leftArm, { transformOrigin: "102px 165px" });
      }
      if (chargeRing) {
        gsap.set(chargeRing, { transformOrigin: "228px 66px" });
      }
      if (eyeLeft && eyeRight) {
        gsap.set([eyeLeft, eyeRight], { transformOrigin: "center center" });
      }

      // Sparkle burst helper
      const sparkleBurst = (count = 8) => {
        if (reducedMotion || !sparkleLayer) return;
        const cx = 225;
        const cy = 60;
        for (let i = 0; i < count; i++) {
          const s = document.createElementNS(SVGNS, "circle");
          s.setAttribute("cx", String(cx));
          s.setAttribute("cy", String(cy));
          s.setAttribute("r", String(gsap.utils.random(2, 4.5)));
          s.setAttribute("fill", i % 2 ? "var(--accent-yellow, #fde047)" : "#ffffff");
          sparkleLayer.appendChild(s);
          const angle = (i / count) * Math.PI * 2;
          const dist = gsap.utils.random(35, 75);
          gsap.fromTo(
            s,
            { opacity: 1, scale: 1, transformOrigin: "center center" },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              scale: 0.2,
              duration: gsap.utils.random(0.5, 0.85),
              ease: "power2.out",
              onComplete: () => s.remove(),
            }
          );
        }
      };

      // Bolt discharge helper (helping expression)
      const boltDischarge = () => {
        if (reducedMotion || !sparkleLayer) return;
        const cx = 232;
        const cy = 58;
        const count = 9;
        for (let i = 0; i < count; i++) {
          const s = document.createElementNS(SVGNS, "circle");
          s.setAttribute("cx", String(cx));
          s.setAttribute("cy", String(cy));
          s.setAttribute("r", String(gsap.utils.random(2, 4)));
          s.setAttribute("fill", i % 2 ? "var(--accent-yellow, #fde047)" : "#ffffff");
          sparkleLayer.appendChild(s);
          const angle = (i / count) * Math.PI * 2;
          const dist = gsap.utils.random(40, 80);
          gsap.fromTo(
            s,
            { opacity: 1, scale: 1, transformOrigin: "center center" },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              scale: 0.2,
              duration: gsap.utils.random(0.5, 0.85),
              ease: "power2.out",
              onComplete: () => s.remove(),
            }
          );
        }
      };

      // Blinking loop helper
      const scheduleBlink = (min = 2.2, max = 5.5, dur = 0.08) => {
        if (reducedMotion || !eyeLeft || !eyeRight) return;
        gsap.to([eyeLeft, eyeRight], {
          scaleY: 0.1,
          duration: dur,
          ease: "power1.inOut",
          yoyo: true,
          repeat: 1,
          delay: gsap.utils.random(min, max),
          onComplete: () => scheduleBlink(min, max, dur),
        });
      };

      // Spontaneous sparkle helper (happy)
      const spontaneousSparkle = () => {
        if (reducedMotion) return;
        sparkleBurst(6);
        gsap.delayedCall(gsap.utils.random(2.5, 4.5), spontaneousSparkle);
      };

      // Expanding charge ring helper (helping)
      const emitChargeRing = () => {
        if (reducedMotion || !chargeRing) return;
        gsap.fromTo(
          chargeRing,
          { scale: 0.4, opacity: 0.7 },
          {
            scale: 1.3,
            opacity: 0,
            duration: 1.2,
            ease: "power1.out",
            onComplete: () => gsap.delayedCall(0.5, emitChargeRing),
          }
        );
      };

      // Tear drop helper (sad)
      const dropTear = () => {
        if (reducedMotion || !tear) return;
        gsap.fromTo(
          tear,
          { opacity: 0, y: 0 },
          {
            opacity: 0.85,
            y: 0,
            duration: 0.3,
            ease: "power1.in",
            onComplete: () =>
              gsap.to(tear, {
                y: 14,
                opacity: 0,
                duration: 0.9,
                ease: "power1.in",
                onComplete: () => {
                  gsap.set(tear, { y: 0 });
                  gsap.delayedCall(gsap.utils.random(4, 7), dropTear);
                },
              }),
          }
        );
      };

      // Ambient animation per emotion
      const startAmbient = () => {
        if (reducedMotion) return;

        if (expression === "neutral") {
          gsap.to(svg, { y: -12, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(bodyGroup, { scale: 1.02, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(cape, { rotation: 3, skewX: -2, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.25 });
          gsap.to(bolt, { scale: 1.06, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
          scheduleBlink(2.2, 5.5, 0.08);
        } else if (expression === "happy") {
          gsap.to(svg, { y: -18, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(bodyGroup, { scale: 1.03, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(headGroup, { rotation: 3, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(cape, { rotation: 5, skewX: -3, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.15 });
          gsap.to(bolt, { scale: 1.1, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.delayedCall(1.4, spontaneousSparkle);
        } else if (expression === "helping") {
          gsap.to(svg, { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(bodyGroup, { scale: 1.015, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(cape, { rotation: 3, skewX: -2, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.2 });
          gsap.to(bolt, { scale: 1.14, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
          emitChargeRing();
          scheduleBlink(2.5, 5, 0.08);
        } else if (expression === "sad") {
          gsap.to(svg, { y: -5, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(bodyGroup, { scale: 1.01, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(cape, { rotation: 1.5, skewX: -1, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.3 });
          gsap.to(bolt, { opacity: 0.4, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
          scheduleBlink(3, 6, 0.1);
          gsap.delayedCall(2.5, dropTear);
        }
      };

      // Entrance animation logic
      if (reducedMotion) {
        gsap.set(wrapper, { scale: 1, y: 0, opacity: 1 });
      } else if (!hasEnteredRef.current && inView) {
        hasEnteredRef.current = true;
        if (expression === "neutral") {
          gsap.from(wrapper, {
            duration: 1.0,
            scale: 0.2,
            y: 40,
            opacity: 0,
            ease: "elastic.out(1, 0.6)",
            delay: 0.1,
            onComplete: startAmbient,
          });
        } else if (expression === "happy") {
          gsap.from(wrapper, {
            duration: 0.9,
            scale: 0.2,
            y: 40,
            opacity: 0,
            ease: "elastic.out(1, 0.55)",
            delay: 0.1,
            onComplete: startAmbient,
          });
        } else if (expression === "helping") {
          gsap.from(wrapper, {
            duration: 0.85,
            scale: 0.3,
            y: 35,
            opacity: 0,
            ease: "back.out(1.6)",
            delay: 0.1,
            onComplete: startAmbient,
          });
        } else {
          gsap.from(wrapper, {
            duration: 0.9,
            scale: 0.6,
            y: 25,
            opacity: 0,
            ease: "power2.out",
            delay: 0.1,
            onComplete: startAmbient,
          });
        }
      } else if (inView) {
        startAmbient();
      }

      // Hover handlers
      handleMouseEnterRef.current = () => {
        if (expression === "neutral") {
          gsap.to(wrapper, { scale: 1.08, duration: 0.35, ease: "back.out(1.7)" });
          gsap.to(headGroup, {
            keyframes: [
              { rotation: -6, duration: 0.12, ease: "power2.out" },
              { rotation: 4, duration: 0.18, ease: "power1.inOut" },
              { rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" },
            ],
          });
          if (!reducedMotion) {
            gsap.fromTo(cape, { rotation: 0 }, { rotation: 8, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 });
          }
          gsap.to(bolt, { filter: "drop-shadow(0px 0px 15px rgba(244, 197, 66, 0.85))", duration: 0.3 });
        } else if (expression === "happy") {
          gsap.to(wrapper, { scale: 1.08, duration: 0.35, ease: "back.out(1.7)" });
          gsap.to(bolt, { filter: "drop-shadow(0px 0px 16px rgba(244, 197, 66, 0.9))", duration: 0.3 });
        } else if (expression === "helping") {
          gsap.to(wrapper, { scale: 1.06, duration: 0.3, ease: "back.out(1.5)" });
          gsap.to(headGroup, { rotation: -4, duration: 0.3, ease: "power2.out" });
          gsap.to(bolt, { filter: "drop-shadow(0px 0px 18px rgba(244, 197, 66, 0.95))", duration: 0.3 });
        } else if (expression === "sad") {
          gsap.to(wrapper, { scale: 1.04, duration: 0.35, ease: "power2.out" });
          gsap.to(headGroup, { rotation: 0, duration: 0.4, ease: "power2.out" });
          gsap.to(bolt, { opacity: 0.8, duration: 0.35 });
        }
      };

      handleMouseLeaveRef.current = () => {
        gsap.to(wrapper, { scale: 1, duration: 0.35, ease: "power2.out" });
        if (expression === "sad") {
          gsap.to(headGroup, { rotation: -6, duration: 0.5, ease: "power2.inOut" });
          gsap.to(bolt, { opacity: 0.4, duration: 0.35 });
        } else if (expression === "helping") {
          gsap.to(headGroup, { rotation: 0, duration: 0.35, ease: "elastic.out(1, 0.5)" });
          gsap.to(bolt, { filter: "none", duration: 0.3 });
        } else {
          gsap.to(bolt, { filter: "none", duration: 0.3 });
        }
      };

      // Click handlers
      handleClickRef.current = () => {
        if (gsap.isTweening(wrapper) || gsap.isTweening(rightArm)) return;

        if (expression === "neutral") {
          const tl = gsap.timeline();
          tl.to(wrapper, { scaleX: 1.12, scaleY: 0.9, y: 8, duration: 0.14, ease: "power2.in" });
          tl.to(
            wrapper,
            {
              keyframes: [
                { scaleX: 0.92, scaleY: 1.12, y: -44, duration: 0.28, ease: "power2.out" },
                { scaleX: 1.05, scaleY: 0.95, y: 0, duration: 0.3, ease: "power2.in" },
                { scaleX: 1, scaleY: 1, duration: 0.45, ease: "elastic.out(1, 0.4)" },
              ],
            },
            ">-0.02"
          );
          tl.to(rightArm, { rotation: -18, duration: 0.14, ease: "power1.out" }, "<")
            .to(rightArm, { rotation: 32, duration: 0.22, ease: "back.out(3)" })
            .to(rightArm, { rotation: 0, duration: 0.55, ease: "elastic.out(1.1, 0.35)" }, ">-0.05");
          if (!reducedMotion) {
            gsap.fromTo(cape, { rotation: 0 }, { rotation: -14, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 });
          }
          tl.add(() => {
            gsap.fromTo(
              bolt,
              { filter: "brightness(2.2) drop-shadow(0px 0px 32px rgba(255,255,255,1))" },
              { filter: "none", duration: 0.8, ease: "power2.out" }
            );
            gsap.fromTo(bolt, { scale: 1.3 }, { scale: 1.06, duration: 0.55, ease: "elastic.out(1, 0.45)" });
            sparkleBurst(10);
          }, 0.24);
        } else if (expression === "happy") {
          const tl = gsap.timeline();
          tl.to(wrapper, { scaleX: 1.12, scaleY: 0.88, y: 8, duration: 0.13, ease: "power2.in" });
          tl.to(
            wrapper,
            {
              keyframes: [
                { scaleX: 0.9, scaleY: 1.14, y: -50, duration: 0.28, ease: "power2.out" },
                { scaleX: 1.06, scaleY: 0.94, y: 0, duration: 0.28, ease: "power2.in" },
                { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" },
              ],
            },
            ">-0.02"
          );
          if (leftArm) {
            tl.to([rightArm, leftArm], { rotation: (i) => (i === 0 ? 30 : -30), duration: 0.2, ease: "back.out(3)" }, "<").to(
              [rightArm, leftArm],
              { rotation: 0, duration: 0.55, ease: "elastic.out(1.1, 0.4)" },
              ">-0.05"
            );
          }
          if (!reducedMotion) {
            gsap.fromTo(cape, { rotation: 0 }, { rotation: -16, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 });
          }
          tl.add(() => {
            gsap.fromTo(
              bolt,
              { filter: "brightness(2.3) drop-shadow(0px 0px 34px rgba(255,255,255,1))" },
              { filter: "none", duration: 0.85, ease: "power2.out" }
            );
            gsap.fromTo(bolt, { scale: 1.35 }, { scale: 1.1, duration: 0.55, ease: "elastic.out(1, 0.45)" });
            sparkleBurst(12);
          }, 0.24);
        } else if (expression === "helping") {
          const tl = gsap.timeline();
          tl.to(rightArm, { rotation: 10, duration: 0.15, ease: "power1.out" }).to(rightArm, {
            rotation: -8,
            duration: 0.5,
            ease: "elastic.out(1, 0.4)",
          });
          gsap.to(wrapper, {
            keyframes: [
              { y: -14, scaleY: 1.04, duration: 0.18, ease: "power2.out" },
              { y: 0, scaleY: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" },
            ],
          });
          if (!reducedMotion) {
            gsap.fromTo(cape, { rotation: 0 }, { rotation: -10, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 });
          }
          tl.add(() => {
            gsap.fromTo(
              bolt,
              { filter: "brightness(2.4) drop-shadow(0px 0px 34px rgba(255,255,255,1))" },
              { filter: "none", duration: 0.85, ease: "power2.out" }
            );
            gsap.fromTo(bolt, { scale: 1.35 }, { scale: 1.14, duration: 0.55, ease: "elastic.out(1, 0.45)" });
            boltDischarge();
          }, 0.18);
        } else if (expression === "sad") {
          const tl = gsap.timeline();
          tl.to(bodyGroup, { rotation: -3, duration: 0.18, ease: "power1.inOut" })
            .to(bodyGroup, { rotation: 3, duration: 0.24, ease: "power1.inOut" })
            .to(bodyGroup, { rotation: 0, duration: 0.4, ease: "elastic.out(1, 0.5)" });
          gsap.to(rightArm, {
            keyframes: [
              { rotation: -8, duration: 0.2, ease: "power1.out" },
              { rotation: 0, duration: 0.4, ease: "elastic.out(1, 0.5)" },
            ],
          });
        }
      };

      // Reaction trigger ("hop" or "tilt")
      if (reaction === "hop") {
        gsap.to(wrapper, {
          keyframes: [
            { y: 6, scaleX: 1.08, scaleY: 0.92, duration: 0.12, ease: "power2.in" },
            { y: -24, scaleX: 0.94, scaleY: 1.08, duration: 0.25, ease: "power2.out" },
            { y: 0, scaleX: 1.03, scaleY: 0.97, duration: 0.22, ease: "power2.in" },
            { y: 0, scaleX: 1, scaleY: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" },
          ],
        });
      } else if (reaction === "tilt") {
        gsap.to(headGroup, {
          keyframes: [
            { rotation: 5, duration: 0.2, ease: "power2.out" },
            { rotation: -4, duration: 0.2, ease: "power1.inOut" },
            { rotation: expression === "sad" ? -6 : 0, duration: 0.4, ease: "elastic.out(1, 0.4)" },
          ],
        });
      }
    }, wrapperRef);

    return () => {
      ctx.revert();
    };
  }, [expression, inView, reducedMotion, reaction]);

  // Sizing: SVG viewBox is 280 x 360 (ratio 0.7778)
  const height = size;
  const width = Math.round(size * (280 / 360));

  return (
    <span
      ref={wrapperRef}
      className={["adig-mascot", "mascot", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-block",
        width,
        height,
        position: "relative",
        cursor: "pointer",
        lineHeight: 0,
        WebkitTapHighlightColor: "transparent",
      }}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt === "" ? true : undefined}
      onMouseEnter={() => handleMouseEnterRef.current()}
      onMouseLeave={() => handleMouseLeaveRef.current()}
      onClick={() => handleClickRef.current()}
    >
      {spark && inView && !reducedMotion && (
        <span aria-hidden="true" className="adig-mascot__spark" />
      )}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 280 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible", shapeRendering: "geometricPrecision" }}
      >
        <defs>
          <filter id={boltGlowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id={bodyShadowId} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#4a7a2e" floodOpacity="0.18" />
          </filter>
          <linearGradient id={suitGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9bdb68" />
            <stop offset="100%" stopColor="#79c247" />
          </linearGradient>
          <linearGradient id={boltGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        <g ref={bodyGroupRef} id="mascot-body-group" filter={`url(#${bodyShadowId})`}>
          {/* Cape */}
          {expression === "sad" ? (
            <path
              ref={capeRef}
              d="M84 122 L62 278 Q 140 292 218 278 L196 122 Z"
              fill="var(--accent-coral, #ef4444)"
              opacity={0.78}
            />
          ) : (
            <path
              ref={capeRef}
              d="M80 120 L50 280 Q 140 300 230 280 L200 120 Z"
              fill="var(--accent-coral, #ef4444)"
              opacity={0.92}
            />
          )}

          {/* Left arm */}
          {expression === "happy" ? (
            <g ref={leftArmRef} style={{ transformOrigin: "102px 165px" }}>
              <rect x="90" y="160" width="24" height="70" rx="12" fill="#6fb843" transform="rotate(-28 102 165)" />
              <circle cx="70" cy="150" r="14" fill="var(--accent-yellow, #f4c542)" />
            </g>
          ) : expression === "helping" ? (
            <g ref={leftArmRef}>
              <rect x="92" y="158" width="22" height="60" rx="11" fill="#6fb843" transform="rotate(46 103 160)" />
              <circle cx="118" cy="196" r="13" fill="var(--accent-yellow, #f4c542)" />
            </g>
          ) : expression === "sad" ? (
            <g ref={leftArmRef}>
              <rect x="94" y="160" width="22" height="74" rx="11" fill="#6fb843" transform="rotate(6 105 160)" />
              <circle cx="102" cy="238" r="13" fill="var(--accent-yellow, #f4c542)" />
            </g>
          ) : (
            <g ref={leftArmRef}>
              <rect x="90" y="160" width="24" height="70" rx="12" fill="#6fb843" transform="rotate(20 102 160)" />
              <circle cx="80" cy="225" r="14" fill="var(--accent-yellow, #f4c542)" />
            </g>
          )}

          {/* Body suit */}
          <rect
            x="100"
            y="140"
            width="80"
            height="120"
            rx="30"
            fill={`url(#${suitGradId})`}
            stroke="var(--brand-green-ink, #4a7a2e)"
            strokeWidth="2"
          />

          {/* Chest emblem */}
          <circle
            cx="140"
            cy="185"
            r="20"
            fill="var(--brand-green-ink, #4a7a2e)"
            opacity={expression === "sad" ? 0.5 : 0.55}
          />
          <path
            d="M135 175 L145 175 L140 185 L148 185 L135 198 L138 188 L130 188 Z"
            fill="var(--accent-yellow, #fde047)"
            opacity={expression === "sad" ? 0.85 : 1}
          />

          {/* Legs & feet */}
          <rect x="115" y="240" width="20" height="60" rx="10" fill="var(--accent-blue, #2563eb)" />
          <rect x="145" y="240" width="20" height="60" rx="10" fill="var(--accent-blue, #2563eb)" />
          <path
            d="M110 290 h30 a10 10 0 0 1 10 10 v0 a0 0 0 0 1 0 0 h-40 a0 0 0 0 1 0 0 v-10 a10 10 0 0 1 10 -10 z"
            fill="var(--accent-yellow, #f4c542)"
          />
          <path
            d="M140 290 h30 a10 10 0 0 1 10 10 v0 a0 0 0 0 1 0 0 h-40 a0 0 0 0 1 0 0 v-10 a10 10 0 0 1 10 -10 z"
            fill="var(--accent-yellow, #f4c542)"
          />

          {/* Head & face group */}
          <g ref={headGroupRef} transform={expression === "sad" ? "rotate(-6 140 138)" : undefined}>
            <circle cx="140" cy="100" r="45" fill="var(--brand-green, #8ed462)" />
            <circle cx="140" cy="100" r="38" fill="var(--canvas-raised, #fffdf5)" />

            {/* Eyebrows */}
            {expression === "helping" && (
              <>
                <path d="M118 86 L131 90" stroke="var(--ink, #2c2e2a)" strokeWidth="3" strokeLinecap="round" />
                <path d="M162 86 L149 90" stroke="var(--ink, #2c2e2a)" strokeWidth="3" strokeLinecap="round" />
              </>
            )}
            {expression === "sad" && (
              <>
                <path d="M119 90 L131 87" stroke="var(--ink, #2c2e2a)" strokeWidth="3" strokeLinecap="round" />
                <path d="M161 90 L149 87" stroke="var(--ink, #2c2e2a)" strokeWidth="3" strokeLinecap="round" />
              </>
            )}

            {/* Eyes */}
            {expression === "happy" ? (
              <>
                <path
                  ref={eyeLeftRef as React.RefObject<SVGPathElement>}
                  d="M119 96 Q125 89 131 96"
                  stroke="var(--ink, #2c2e2a)"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  ref={eyeRightRef as React.RefObject<SVGPathElement>}
                  d="M149 96 Q155 89 161 96"
                  stroke="var(--ink, #2c2e2a)"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            ) : expression === "sad" ? (
              <>
                <circle ref={eyeLeftRef as React.RefObject<SVGCircleElement>} cx="126" cy="98" r="4.6" fill="var(--ink, #2c2e2a)" />
                <circle ref={eyeRightRef as React.RefObject<SVGCircleElement>} cx="154" cy="98" r="4.6" fill="var(--ink, #2c2e2a)" />
              </>
            ) : (
              <>
                <circle ref={eyeLeftRef as React.RefObject<SVGCircleElement>} cx="125" cy={expression === "helping" ? 97 : 95} r="5" fill="var(--ink, #2c2e2a)" />
                <circle ref={eyeRightRef as React.RefObject<SVGCircleElement>} cx="155" cy={expression === "helping" ? 97 : 95} r="5" fill="var(--ink, #2c2e2a)" />
              </>
            )}

            {/* Cheeks blush */}
            {expression === "happy" ? (
              <>
                <circle cx="114" cy="108" r="7" fill="var(--accent-coral, #ef4444)" opacity={0.4} />
                <circle cx="166" cy="108" r="7" fill="var(--accent-coral, #ef4444)" opacity={0.4} />
              </>
            ) : expression === "sad" ? (
              <>
                <circle cx="116" cy="109" r="5.5" fill="var(--accent-coral, #ef4444)" opacity={0.3} />
                <circle cx="164" cy="109" r="5.5" fill="var(--accent-coral, #ef4444)" opacity={0.3} />
              </>
            ) : (
              <>
                <circle cx="115" cy={expression === "helping" ? 108 : 106} r="6" fill="var(--accent-coral, #ef4444)" opacity={0.35} />
                <circle cx="165" cy={expression === "helping" ? 108 : 106} r="6" fill="var(--accent-coral, #ef4444)" opacity={0.35} />
              </>
            )}

            {/* Tear (sad only) */}
            {expression === "sad" && (
              <path ref={tearRef} d="M126 104 q4 6 0 9 q-4 -3 0 -9 Z" fill="var(--accent-blue, #3b82f6)" opacity={0} />
            )}

            {/* Mouth */}
            {expression === "happy" ? (
              <path d="M126 108 Q 140 126 154 108 Q 140 116 126 108 Z" fill="var(--ink, #2c2e2a)" />
            ) : expression === "sad" ? (
              <path d="M130 116 Q 140 108 150 116" stroke="var(--ink, #2c2e2a)" strokeWidth="3" strokeLinecap="round" fill="none" />
            ) : expression === "helping" ? (
              <path d="M130 112 Q 140 115 150 112" stroke="var(--ink, #2c2e2a)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M131 111 Q 140 116 149 111" stroke="var(--ink, #2c2e2a)" strokeWidth="3" strokeLinecap="round" fill="none" />
            )}
          </g>
        </g>

        {/* Right arm & bolt */}
        {expression === "sad" ? (
          <g ref={rightArmRef} style={{ transformOrigin: "160px 160px" }}>
            <rect x="160" y="152" width="22" height="76" rx="11" fill="#7cc44f" transform="rotate(-14 160 152)" />
            <circle cx="188" cy="222" r="14" fill="var(--accent-yellow, #f4c542)" />
            <g ref={boltRef} filter={`url(#${boltGlowId})`} opacity={0.55}>
              <path d="M196 196 L184 220 h12 L182 250 L206 216 h-12 L202 196 Z" fill={`url(#${boltGradId})`} />
            </g>
          </g>
        ) : expression === "helping" ? (
          <g ref={rightArmRef} style={{ transformOrigin: "160px 160px" }}>
            <rect x="160" y="150" width="24" height="80" rx="12" fill="#7cc44f" transform="rotate(-48 160 150)" />
            <circle cx="222" cy="98" r="16" fill="var(--accent-yellow, #f4c542)" />
            <circle
              ref={chargeRingRef}
              cx="228"
              cy="66"
              r="30"
              fill="none"
              stroke="var(--accent-yellow, #f4c542)"
              strokeWidth="2.5"
              opacity={0}
            />
            <g ref={boltRef} filter={`url(#${boltGlowId})`}>
              <path d="M232 28 L212 68 h20 L217 118 L252 58 h-20 L242 28 Z" fill={`url(#${boltGradId})`} />
            </g>
          </g>
        ) : (
          <g ref={rightArmRef} style={{ transformOrigin: "160px 160px" }}>
            <rect x="160" y="150" width="24" height="80" rx="12" fill="#7cc44f" transform="rotate(-40 160 150)" />
            <circle cx="215" cy="105" r="16" fill="var(--accent-yellow, #f4c542)" />
            <g ref={boltRef} filter={`url(#${boltGlowId})`}>
              <path d="M225 30 L205 70 h20 L210 120 L245 60 h-20 L235 30 Z" fill={`url(#${boltGradId})`} />
            </g>
          </g>
        )}

        {/* Particle/Sparkle layer */}
        <g ref={sparkleLayerRef} pointerEvents="none" />
      </svg>
    </span>
  );
}
