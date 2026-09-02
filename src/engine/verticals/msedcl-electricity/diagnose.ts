// MSEDCL electricity — diagnosis / classification (T4).
//
// Classifies a bill into one of the vertical's codes using EXPLICIT, tunable rules (spec D19, story 4/5):
//   slab_jump ............ actual reading, long accumulation period, pro-rata shows a positive overcharge.
//   average_billing ...... estimated/average reading over an accumulation window, positive overcharge.
//   smart_meter_catch_up . a recent meter swap produced a one-time catch-up bill that pro-rata undoes.
//   legitimate ........... no accumulation distortion (even a genuinely high single-month actual bill).
//   unsupported .......... consumer category the calc engine does not cover (BPL / non-residential).
//
// The mechanism is deliberately simple and honest: any "does this actually overcharge?" question is
// answered by running the same pro-rata calc the UI shows, never by a separate heuristic — so the
// classification and the rupee figure can never disagree. Thresholds are named constants (tunable after
// the first real bills, per D19). Pure function, no I/O; exercised via the `runVertical` seam.

import type { DiagnoseFn, DiagnosisResult, UserInput } from "../../types";
import { isCategorySupported } from "../../data/tariff";
import { calculate } from "./calculate";

/** Vertical-specific classification codes (spec D19). `DiagnosisResult.classification` is a plain string. */
export const CLASSIFICATION = {
  SLAB_JUMP: "slab_jump",
  AVERAGE_BILLING: "average_billing",
  SMART_METER_CATCH_UP: "smart_meter_catch_up",
  LEGITIMATE: "legitimate",
  UNSUPPORTED: "unsupported",
} as const;

/**
 * A billing period longer than this (inclusive days) is treated as ACCUMULATION — multiple unread
 * cycles lumped into one bill — which is what makes telescopic slabs distort the charge. ~30-day bills
 * fall below it and are normal. Tunable (D19: "thresholds are tunable after first real bills").
 */
export const ACCUMULATION_PERIOD_DAYS = 35;

const MS_PER_DAY = 86_400_000;

/** Whole days in [from, to], counting both endpoints (a 1st→31st bill = 31 days). */
function inclusiveDays(periodFrom: string, periodTo: string): number {
  return Math.round((Date.parse(periodTo) - Date.parse(periodFrom)) / MS_PER_DAY) + 1;
}

export const diagnose: DiagnoseFn = (input: UserInput): DiagnosisResult => {
  // Out-of-scope category: say so honestly, offer no escalation (spec decision 4).
  if (!isCategorySupported(input.category)) {
    return {
      classification: CLASSIFICATION.UNSUPPORTED,
      isActionable: false,
      summary: "This tool does not support your tariff category yet, so it cannot check this bill.",
      rationale:
        "The pro-rata overbilling check currently covers residential (LT-I-B) connections only. " +
        "BPL and non-residential tariffs are out of scope for this version.",
    };
  }

  const estimated = input.readingType === "estimated";
  const longPeriod = inclusiveDays(input.periodFrom, input.periodTo) > ACCUMULATION_PERIOD_DAYS;

  // Smart-meter path (D19): a recently replaced meter can produce a one-time "catch-up" bill that lumps
  // accumulated units. Run it through the pro-rata calc; a positive overcharge confirms catch-up, else
  // the higher reading is genuine and we say why.
  if (input.recentMeterSwap) {
    const calc = calculate(input);
    if (calc.overcharge > 0) {
      return {
        classification: CLASSIFICATION.SMART_METER_CATCH_UP,
        isActionable: true,
        summary: "Your new meter appears to have billed accumulated units in one go (a catch-up bill).",
        rationale:
          "After a recent meter replacement, units that built up before the swap look like they were " +
          "billed together, pushing you into higher telescopic slabs. Spread month-by-month, the lawful " +
          "energy charge is lower — the difference is the estimated overcharge.",
      };
    }
    return {
      classification: CLASSIFICATION.LEGITIMATE,
      isActionable: false,
      summary: "This looks like a genuine bill from your new meter, not a catch-up overcharge.",
      rationale:
        "Even spread across the billing months, the energy charge does not fall — so the new meter's " +
        "reading is not creating a slab-jump distortion.",
    };
  }

  // Accumulation path (D19): a long period OR an estimated/average reading means units may have been
  // lumped. Confirm with the pro-rata calc; a positive overcharge distinguishes the two actionable codes.
  if (longPeriod || estimated) {
    const calc = calculate(input);
    if (calc.overcharge > 0) {
      if (estimated) {
        return {
          classification: CLASSIFICATION.AVERAGE_BILLING,
          isActionable: true,
          summary: "Your bill was raised on an estimated/average reading, which has overcharged the energy component.",
          rationale:
            "Because the reading was estimated rather than actual, accumulated units were billed together " +
            "and pushed into higher telescopic slabs. Billed month-by-month, the lawful energy charge is " +
            "lower — the difference is the estimated overcharge.",
        };
      }
      return {
        classification: CLASSIFICATION.SLAB_JUMP,
        isActionable: true,
        summary: "Units from several months appear billed in one cycle, pushing you into higher slabs (slab-jump).",
        rationale:
          "The billing period spans more than one cycle, so lumped units cross into higher telescopic slabs. " +
          "Spread across the equivalent months, the lawful energy charge is lower — the difference is the " +
          "estimated overcharge.",
      };
    }
    // Accumulation window, but pro-rata gives no benefit (e.g. usage stays within one slab, or the period
    // falls outside the verified tariff data so nothing could be priced).
    return {
      classification: CLASSIFICATION.LEGITIMATE,
      isActionable: false,
      summary: "Even spread across the billing months, this bill does not show a slab-jump overcharge.",
      rationale:
        "Pricing the units month-by-month gives the same energy charge as billed, so there is no " +
        "telescopic-slab distortion to challenge.",
    };
  }

  // Normal path: ~30-day period, actual reading. Lawful even if the amount is high (spec story 5).
  return {
    classification: CLASSIFICATION.LEGITIMATE,
    isActionable: false,
    summary: "This looks like a normal, single-cycle bill on an actual meter reading.",
    rationale:
      "A roughly one-month period read from the meter has no accumulation to unwind — a high amount here " +
      "reflects genuine usage, not a billing error, so there is nothing to escalate.",
  };
};

export default diagnose;
