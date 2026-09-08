import type { ExtractedBill, ReadingType } from "./types";

export interface RawExtractedFields {
  unitsBilled?: number;
  currentReading?: number;
  previousReading?: number;
  multiplier?: number;
  periodFrom?: string; // ISO YYYY-MM-DD
  periodTo?: string;   // ISO YYYY-MM-DD
  amountBilled?: number;
  energyChargeBilled?: number;
  readingType?: ReadingType;
  category?: string;
  source: "pdf" | "image";
  rawText?: string;
}

/**
 * Validates unitsBilled.
 * If current and previous meter readings are both provided:
 * requires units ≈ (current - previous) * multiplier (tolerance of ±1 unit for rounding).
 * If it violates this consistency check (e.g. naive extractor assigned 21375 instead of 167),
 * unitsBilled is rejected and left undefined.
 */
export function validateUnits(
  units?: number,
  currentReading?: number,
  previousReading?: number,
  multiplier = 1.0
): number | undefined {
  if (units === undefined || !Number.isFinite(units) || units <= 0 || units >= 100000) {
    return undefined;
  }

  if (
    currentReading !== undefined &&
    previousReading !== undefined &&
    Number.isFinite(currentReading) &&
    Number.isFinite(previousReading) &&
    currentReading >= previousReading
  ) {
    const computedUnits = (currentReading - previousReading) * (multiplier || 1.0);
    if (Math.abs(computedUnits - units) > 1.5) {
      // Consistency check failed: current - previous != units
      return undefined;
    }
  }

  return Math.round(units);
}

/**
 * Validates amountBilled: must be positive and below 100,000.
 */
export function validateAmount(amount?: number): number | undefined {
  if (amount === undefined || !Number.isFinite(amount) || amount <= 0 || amount >= 100000) {
    return undefined;
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Validates billing period dates:
 * - Each year must be within the last ~3-4 years (between currentYear - 4 and currentYear + 1).
 * - periodFrom < periodTo.
 * - Days span between 15 and 60 days (approx ~20-45 days for monthly utility billing).
 * If any check fails, both dates are discarded to avoid corrupted diagnosis.
 */
export function validateDates(
  periodFrom?: string,
  periodTo?: string
): { periodFrom?: string; periodTo?: string } {
  if (!periodFrom || !periodTo) {
    return {};
  }

  const fromTime = Date.parse(periodFrom);
  const toTime = Date.parse(periodTo);
  if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
    return {};
  }

  if (fromTime >= toTime) {
    return {};
  }

  const spanDays = Math.round((toTime - fromTime) / 86400000);
  if (spanDays < 15 || spanDays > 60) {
    return {};
  }

  const currentYear = new Date().getFullYear();
  const fromYear = parseInt(periodFrom.split("-")[0], 10);
  const toYear = parseInt(periodTo.split("-")[0], 10);

  // Reject historical dates (like 2006/2013 connection dates) or far-future dates
  if (fromYear < currentYear - 4 || fromYear > currentYear + 1) {
    return {};
  }
  if (toYear < currentYear - 4 || toYear > currentYear + 1) {
    return {};
  }

  return { periodFrom, periodTo };
}

/**
 * Validates energyChargeBilled:
 * - Must be positive.
 * - Must be <= amountBilled (energy charge cannot exceed total bill).
 */
export function validateEnergyCharge(
  energyCharge?: number,
  amountBilled?: number
): number | undefined {
  if (energyCharge === undefined || !Number.isFinite(energyCharge) || energyCharge <= 0) {
    return undefined;
  }
  if (amountBilled !== undefined && Number.isFinite(amountBilled) && energyCharge > amountBilled) {
    return undefined;
  }
  return Math.round(energyCharge * 100) / 100;
}

/**
 * Applies all plausibility checks and computes confidence and fieldsFilled.
 */
export function applyPlausibilityGating(raw: RawExtractedFields): ExtractedBill {
  const unitsBilled = validateUnits(
    raw.unitsBilled,
    raw.currentReading,
    raw.previousReading,
    raw.multiplier
  );

  const amountBilled = validateAmount(raw.amountBilled);

  const { periodFrom, periodTo } = validateDates(raw.periodFrom, raw.periodTo);

  const energyChargeBilled = validateEnergyCharge(raw.energyChargeBilled, amountBilled);
  const energyChargeVerifyRequired = energyChargeBilled !== undefined;

  const readingType: ReadingType = raw.readingType === "estimated" ? "estimated" : "actual";
  const category = raw.category === "LT-I-B-residential" ? "LT-I-B-residential" : undefined;

  let fieldsFilled = 0;
  if (unitsBilled !== undefined) fieldsFilled++;
  if (periodFrom !== undefined) fieldsFilled++;
  if (periodTo !== undefined) fieldsFilled++;
  if (amountBilled !== undefined) fieldsFilled++;
  if (readingType !== undefined) fieldsFilled++;
  if (category !== undefined) fieldsFilled++;
  if (energyChargeBilled !== undefined) fieldsFilled++;

  const coreFields = [unitsBilled, periodFrom, periodTo, amountBilled].filter(
    (v) => v !== undefined
  ).length;

  let confidence: "high" | "medium" | "low" = "low";
  if (coreFields === 4) {
    confidence = "high";
  } else if (coreFields >= 2) {
    confidence = "medium";
  }

  return {
    unitsBilled,
    periodFrom,
    periodTo,
    amountBilled,
    readingType,
    category,
    energyChargeBilled,
    energyChargeVerifyRequired,
    currentReading: raw.currentReading,
    previousReading: raw.previousReading,
    confidence,
    fieldsFilled,
    source: raw.source,
    rawText: raw.rawText,
  };
}
