// Zero-PII product analytics (T9).
//
// Store-nothing / zero-PII contract:
//   - We NEVER send bill content, the free-text narrative, names, addresses, consumer numbers, or the
//     raw overcharge amount. The public API below only accepts enumerated, non-identifying values
//     (a bucketed overcharge RANGE, a diagnosis flag, an instrument/tier id) so a caller physically
//     cannot leak PII through it.
//   - The distinct id is a random, in-memory, per-session value — it is not persisted anywhere and
//     does not survive a reload, so no one is tracked across sessions.
//   - Transport: if NEXT_PUBLIC_MIXPANEL_TOKEN is set we POST to Mixpanel's HTTP API (no SDK / no
//     external script, so nothing extra loads); otherwise a no-op shim that console-logs in dev only.
//
// The module is import-safe on the server (Next may evaluate it during SSR): every browser API is
// guarded, and events are only actually dispatched in the browser.

export type AnalyticsProps = Record<string, string | number | boolean>;

/** Event sink — the seam we swap for a mock in tests and for Mixpanel/console at runtime. */
type Sink = (event: string, props: AnalyticsProps) => void;

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Bucket a rupee overcharge into a coarse RANGE label. We report only the bucket — never the exact
 * amount — so the event carries no figure that could be tied back to a specific bill.
 */
export function bucketOvercharge(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees <= 0) return "none";
  if (rupees < 500) return "1-499";
  if (rupees < 1000) return "500-999";
  if (rupees < 2500) return "1000-2499";
  if (rupees < 5000) return "2500-4999";
  if (rupees < 10000) return "5000-9999";
  return "10000+";
}

// ---- Transport ---------------------------------------------------------------------------------

let distinctId: string | null = null;
function getDistinctId(): string {
  if (distinctId) return distinctId;
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  distinctId = c?.randomUUID ? c.randomUUID() : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return distinctId;
}

function mixpanelSink(event: string, props: AnalyticsProps): void {
  try {
    const payload = {
      event,
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: getDistinctId(),
        time: Date.now(),
        ...props,
      },
    };
    const data = btoa(JSON.stringify(payload));
    const url = `https://api.mixpanel.com/track?data=${encodeURIComponent(data)}`;
    // sendBeacon survives page navigation (e.g. the submit → guidance transition) and is fire-and-forget.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      void fetch(url, { method: "POST", keepalive: true, mode: "no-cors" });
    }
  } catch {
    // Analytics must never break the flow — swallow everything.
  }
}

function defaultSink(event: string, props: AnalyticsProps): void {
  if (typeof window === "undefined") return; // never fire during SSR
  if (MIXPANEL_TOKEN) {
    mixpanelSink(event, props);
  } else if (IS_DEV) {
    // No token: a visible no-op so the wiring is auditable in development.
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props);
  }
}

let sink: Sink = defaultSink;

/** Test seam: inject a capturing sink, or pass null to restore the default. */
export function _setSinkForTest(next: Sink | null): void {
  sink = next ?? defaultSink;
}

function track(event: string, props: AnalyticsProps = {}): void {
  sink(event, props);
}

// ---- Public, PII-safe API ----------------------------------------------------------------------
//
// Each function takes only non-identifying, enumerated inputs. There is deliberately no generic
// `track(name, arbitraryProps)` exported, so no call site can attach bill content or PII.

export const analytics = {
  /** The landing page loaded (top of the S0 step). No properties. */
  landingViewed(): void {
    track("landing_viewed");
  },

  /** The visitor scrolled past the hero on the landing (comprehension-positive signal). No properties. */
  heroPassed(): void {
    track("hero_passed");
  },

  /** The citizen opened the check flow (top of funnel). No properties. */
  intakeStarted(): void {
    track("intake_started");
  },

  /** The citizen submitted intake and diagnosis ran. No properties. */
  diagnosisStarted(): void {
    track("diagnosis_started");
  },

  /** Overcharge computed — reports the BUCKETED range and whether it is actionable. No amount, no PII. */
  overchargeCalculated(overchargeRupees: number, actionable: boolean): void {
    track("overcharge_calculated", { bucket: bucketOvercharge(overchargeRupees), actionable });
  },

  /** An escalation instrument was assembled for the citizen. `tier` is the instrument id (e.g. "icrs"). */
  instrumentGenerated(tier: string): void {
    track("instrument_generated", { tier: tier || "none" });
  },

  /** The submit / how-to-file guidance was viewed for a tier. */
  guidanceViewed(tier: string): void {
    track("guidance_viewed", { tier: tier || "none" });
  },

  /** Self-reported: the citizen indicated they filed the escalation. */
  escalationSubmitted(tier: string): void {
    track("escalation_submitted", { tier: tier || "none" });
  },

  /** The citizen obtained the escalation letter via download, copy button, or copying preview text. */
  letterObtained(tier: string, method: "download" | "copy_button" | "copy_event"): void {
    track("letter_obtained", { tier: tier || "none", method });
  },
};

export default analytics;
