// Shared client-side form state + input mapping for the check flow (T7).
//
// The intake screen collects raw strings (what HTML inputs emit); this module turns them into the
// engine's typed `UserInput`. Rates are never collected — the engine owns the tariff (spec D12).
// `declaredStage` and `priorTierRef` are collected later, on the Documents screen (spec D16), so
// they are threaded in separately here rather than living on the intake form.

import type { UserInput } from "@/engine/types";

/** Raw intake form values (all strings / booleans, pre-validation). */
export interface FormState {
  unitsBilled: string;
  periodFrom: string;
  periodTo: string;
  amountBilled: string;
  energyChargeBilled: string;
  readingType: string;
  category: string;
  circle: string;
  meterType: string;
  priorMonthlyAvgUnits: string;
  recentMeterSwap: boolean;
  /** Citizen's own free-text account (any language) — feeds the caged narrative, not the legal text. */
  userDescription: string;
}

export const EMPTY_FORM: FormState = {
  unitsBilled: "",
  periodFrom: "",
  periodTo: "",
  amountBilled: "",
  energyChargeBilled: "",
  readingType: "",
  category: "LT-I-B-residential", // the only supported category today; pre-selected
  circle: "",
  meterType: "",
  priorMonthlyAvgUnits: "",
  recentMeterSwap: false,
  userDescription: "",
};

/** Prior-tier reference collected on the Documents screen for Schedule A / B rungs (spec story 10). */
export interface PriorRefState {
  referenceNo: string;
  date: string;
  outcome: string;
}

export const EMPTY_PRIOR_REF: PriorRefState = { referenceNo: "", date: "", outcome: "" };

function numOrUndefined(s: string): number | undefined {
  const t = s.trim();
  if (t.length === 0) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Map the raw form (+ the later-collected stage / prior-tier ref) into the engine's `UserInput`.
 * Missing optional numbers become `undefined` so the engine's `?? default` logic behaves; the
 * required `unitsBilled`, `amountBilled` and `energyChargeBilled` fall back to 0 (validation blocks
 * submission before that matters).
 */
export function buildUserInput(
  form: FormState,
  declaredStage?: string,
  priorRef?: PriorRefState
): UserInput {
  const priorTierRef =
    priorRef && priorRef.referenceNo.trim().length > 0
      ? {
          referenceNo: priorRef.referenceNo.trim(),
          date: priorRef.date.trim(),
          outcome: priorRef.outcome.trim() || undefined,
        }
      : undefined;

  return {
    unitsBilled: numOrUndefined(form.unitsBilled) ?? 0,
    periodFrom: form.periodFrom,
    periodTo: form.periodTo,
    amountBilled: numOrUndefined(form.amountBilled) ?? 0,
    energyChargeBilled: numOrUndefined(form.energyChargeBilled) ?? 0,
    readingType: form.readingType === "estimated" ? "estimated" : "actual",
    category: form.category,
    circle: form.circle.trim() || undefined,
    meterType:
      form.meterType === "smart" ? "smart" : form.meterType === "regular" ? "regular" : undefined,
    priorMonthlyAvgUnits: numOrUndefined(form.priorMonthlyAvgUnits),
    recentMeterSwap: form.recentMeterSwap || undefined,
    declaredStage: declaredStage,
    priorTierRef,
  };
}

/** Validate the intake screen. Returns a map of field → message (empty = valid). */
export function validateIntake(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const units = numOrUndefined(form.unitsBilled);
  if (units === undefined || units <= 0) {
    errors.unitsBilled = "Enter the number of units billed (a positive number).";
  }
  if (!form.periodFrom) errors.periodFrom = "Enter the start of the billing period.";
  if (!form.periodTo) errors.periodTo = "Enter the end of the billing period.";
  if (form.periodFrom && form.periodTo && form.periodTo < form.periodFrom) {
    errors.periodTo = "The end date cannot be before the start date.";
  }
  const amount = numOrUndefined(form.amountBilled);
  if (amount === undefined || amount <= 0) {
    errors.amountBilled = "Enter the total amount billed (a positive number).";
  }
  const energyCharge = numOrUndefined(form.energyChargeBilled);
  if (energyCharge === undefined || energyCharge <= 0) {
    errors.energyChargeBilled = "Enter the energy charges shown on your bill (a positive number).";
  } else if (amount !== undefined && amount > 0 && energyCharge > amount) {
    errors.energyChargeBilled =
      "Energy charges can't be more than your total amount billed — check you haven't swapped the two figures.";
  }
  if (!form.readingType) errors.readingType = "Select whether the reading was actual or estimated.";
  if (!form.category) errors.category = "Select your consumer category.";
  return errors;
}

/** The four screens of the flow, and how each maps onto the 5-step tracker (Diagnose…Submit). */
export type Screen = "intake" | "results" | "documents" | "guidance";

export const STEP_LABELS = ["Diagnose", "Calculate", "Evidence", "Document", "Submit"];

/**
 * Tracker index per screen. Intake gathers what's needed to diagnose (0); Results presents the
 * diagnosis, the calculation and the evidence checklist, so it lands on Evidence (2); Documents (3);
 * Guidance is the Submit step (4).
 */
export const SCREEN_STEP: Record<Screen, number> = {
  intake: 0,
  results: 2,
  documents: 3,
  guidance: 4,
};
