"use client";
import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

export function LandingAnalytics(): null {
  const landingFired = useRef(false);
  const heroSeen = useRef(false);
  const heroPassedFired = useRef(false);

  // Fire landing_viewed once on mount.
  useEffect(() => {
    if (!landingFired.current) {
      landingFired.current = true;
      try {
        analytics.landingViewed();
      } catch {
        /* analytics must never break the page */
      }
    }
  }, []);

  // Fire hero_passed once when the hero was seen and then scrolled past the top of the viewport.
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    try {
      const heroEl = document.querySelector(".adig-hero");
      if (!heroEl) return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              heroSeen.current = true;
            } else if (
              heroSeen.current &&
              !heroPassedFired.current &&
              entry.boundingClientRect.top <= 0
            ) {
              heroPassedFired.current = true;
              try {
                analytics.heroPassed();
              } catch {
                /* swallow */
              }
              observer.disconnect();
            }
          }
        },
        { threshold: 0 }
      );

      observer.observe(heroEl);

      return () => {
        observer.disconnect();
      };
    } catch {
      /* analytics must never break the page */
    }
  }, []);

  return null;
}
