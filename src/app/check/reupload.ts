import type { ExtractedBill } from "@/lib/billExtract/types";

export const AUTO_FILLABLE_FIELDS = [
  "unitsBilled",
  "periodFrom",
  "periodTo",
  "amountBilled",
  "readingType",
  "category",
  "energyChargeBilled",
] as const;

export type AutoFillableField = (typeof AUTO_FILLABLE_FIELDS)[number];

export interface ReuploadUpdates {
  clears: AutoFillableField[];
  sets: Array<[AutoFillableField, string]>;
  nextAutoFilled: Set<string>;
  energyChargeVerifyRequired: boolean;
  wasReplaced: boolean;
}

/**
 * Computes form updates when a bill is successfully extracted.
 *
 * Requirements:
 * 1. Replace, not merge: If a field was previously auto-filled (in prevAutoFilled)
 *    and the new extraction does not provide it, it is included in `clears`.
 * 2. Preserve manual edits: If the user manually edited a field, it is no longer
 *    in `prevAutoFilled` (cleared by handleFieldChange), so it will not be in `clears`.
 * 3. `energyChargeVerifyRequired`: Reset to false unless the new extraction provides
 *    an energy charge flagged for verification.
 * 4. `wasReplaced`: True if `prevAutoFilled` was non-empty, indicating earlier auto-filled
 *    values were replaced or cleared.
 */
export function computeReuploadUpdates(
  prevAutoFilled: Set<string> | ReadonlySet<string>,
  extracted: ExtractedBill
): ReuploadUpdates {
  const sets: Array<[AutoFillableField, string]> = [];
  const nextAutoFilled = new Set<string>();

  if (extracted.unitsBilled !== undefined) {
    sets.push(["unitsBilled", String(extracted.unitsBilled)]);
    nextAutoFilled.add("unitsBilled");
  }
  if (extracted.periodFrom) {
    sets.push(["periodFrom", extracted.periodFrom]);
    nextAutoFilled.add("periodFrom");
  }
  if (extracted.periodTo) {
    sets.push(["periodTo", extracted.periodTo]);
    nextAutoFilled.add("periodTo");
  }
  if (extracted.amountBilled !== undefined) {
    sets.push(["amountBilled", String(extracted.amountBilled)]);
    nextAutoFilled.add("amountBilled");
  }
  if (extracted.readingType) {
    sets.push(["readingType", extracted.readingType]);
    nextAutoFilled.add("readingType");
  }
  if (extracted.category) {
    sets.push(["category", extracted.category]);
    nextAutoFilled.add("category");
  }
  if (extracted.energyChargeBilled !== undefined) {
    sets.push(["energyChargeBilled", String(extracted.energyChargeBilled)]);
    nextAutoFilled.add("energyChargeBilled");
  }

  // Clear fields that were previously auto-filled but are NOT provided in the new extraction
  const clears: AutoFillableField[] = AUTO_FILLABLE_FIELDS.filter(
    (field) => prevAutoFilled.has(field) && !nextAutoFilled.has(field)
  );

  const energyChargeVerifyRequired =
    extracted.energyChargeBilled !== undefined && Boolean(extracted.energyChargeVerifyRequired);

  const wasReplaced = prevAutoFilled.size > 0;

  return {
    clears,
    sets,
    nextAutoFilled,
    energyChargeVerifyRequired,
    wasReplaced,
  };
}
