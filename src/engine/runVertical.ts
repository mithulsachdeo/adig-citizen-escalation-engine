// The primary engine seam: the pure pipeline `runVertical(spec, input)` (spec §"Test seams", D16).
//
// It threads one citizen's input through the vertical as data: normalize → diagnose → calculate (when
// the vertical has a calc step) → select the ladder tier from the declared stage → resolve that tier's
// instrument. No I/O, no throwing for expected input problems — a tier that needs the prior-tier
// reference but lacks it fails cleanly via `PipelineResult.error` (spec story 10).
//
// Kept vertical-agnostic: everything electricity-specific lives in the spec's `diagnosis`/`calculation`
// functions and its ladder data, so a diagnosis-only vertical (passport/CPGRAMS) runs through unchanged.

import type { PipelineError, PipelineResult, UserInput, Vertical } from "./types";

/** Default rung when the citizen has not said where they are stuck: the first-contact instrument. */
const DEFAULT_STAGE = "new";

/**
 * Light intake normalization: trim free-text fields and collapse empty strings (which HTML form
 * selects/inputs emit) to `undefined` so downstream `?? default` logic behaves. Pure — returns a copy.
 */
function normalizeInput(input: UserInput): UserInput {
  const trimmed = (s: string | undefined): string | undefined => {
    if (typeof s !== "string") return s;
    const t = s.trim();
    return t.length > 0 ? t : undefined;
  };
  return {
    ...input,
    circle: trimmed(input.circle),
    declaredStage: trimmed(input.declaredStage),
  };
}

export function runVertical(spec: Vertical, rawInput: UserInput): PipelineResult {
  const input = normalizeInput(rawInput);

  const diagnosis = spec.diagnosis(input);
  const calculation = spec.calculation ? spec.calculation(input) : null;
  const evidence = spec.evidenceChecklist;

  // Genuine bill / out-of-scope category: offer no escalation at all (spec story 5).
  if (!diagnosis.isActionable) {
    return { diagnosis, calculation, evidence, tier: null, instrument: null };
  }

  // Tier selection is by declared stage (D16). RTI lives in `sidecars`, never the ladder, so selection
  // can never land on it.
  const stage = input.declaredStage ?? DEFAULT_STAGE;
  const tier = spec.escalationLadder.find((t) => t.stage === stage) ?? null;
  if (!tier) {
    return { diagnosis, calculation, evidence, tier: null, instrument: null };
  }

  // Schedule A/B rungs must cite the previous tier's reference. Missing it is an expected input gap,
  // not a crash: return the selected tier for context but withhold the instrument, with a typed error.
  if (tier.requiresPriorTierRef && !hasPriorTierRef(input)) {
    const error: PipelineError = {
      code: "missing_prior_tier_ref",
      tier: tier.instrument,
      message:
        `${tier.instrumentName} must cite the previous tier's complaint/order reference, date and ` +
        `outcome, but none was provided. Enter the prior-tier reference to generate this document.`,
    };
    return { diagnosis, calculation, evidence, tier, instrument: null, error };
  }

  return { diagnosis, calculation, evidence, tier, instrument: tier.instrument };
}

/** True only when a usable prior-tier reference is present (a bare object with a blank ref does not count). */
function hasPriorTierRef(input: UserInput): boolean {
  const ref = input.priorTierRef;
  return !!ref && typeof ref.referenceNo === "string" && ref.referenceNo.trim().length > 0;
}

export default runVertical;
