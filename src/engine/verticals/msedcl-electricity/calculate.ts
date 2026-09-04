// MSEDCL electricity — pro-rata overcharge calculation engine (T3).
//
// The overbilling this vertical targets is SLAB-JUMP distortion: when a meter is unread for several
// cycles and the accumulated units are billed as one lump, telescopic slabs push units into higher
// bands than they would occupy month-by-month. The lawful figure (MERC Supply Code 2021, Reg. 16.1.1)
// is the standard monthly pro-rata: accumulated units ÷ billing months, each equivalent month billed
// at the monthly telescopic slabs, summed. overcharge = actual(lumped) − lawful(pro-rata), floored at 0.
//
// Scope decisions (tariff-config-notes.md, grilling 2026-09-01):
//   1. ENERGY-CHARGE component ONLY — wheeling is flat across slabs and fixed charges are per-connection,
//      so lumping distorts only the energy charge (excludedFromOvercharge covers the rest).
//   2. Per-equivalent-month tariff on straddle — each equivalent month is priced at the version in force
//      on that month, not one bill-date tariff (config.straddleRule).
//   4. BPL / non-residential → `unsupported` (fail honestly, never a wrong calc).
//   6. Tariff table is verified-or-draft: FY2025-26 ships slabs:[] (OCR-garbled) → treated as un-priceable.
// Periods before coverageBoundaryFrom (2025-07-01) → `outsideVerifiedTariff`, not guessed.
//
// Pure function, no I/O. Exercised via the `runVertical` seam (spec §"Test seams").

import type { CalculateFn, CalculationResult, SlabCharge, UserInput } from "../../types";
import { getTariffVersionForDate, isCategorySupported, tariff } from "../../data/tariff";
import type { TariffSlab, TariffVersion } from "../../data/tariff";

const MS_PER_DAY = 86_400_000;
/** Gregorian mean month length — used to convert a billing period into equivalent months. */
const AVG_DAYS_PER_MONTH = 30.4375;

/**
 * The estimate caveat shown with every figure (spec D14, story 7). Names the rule the pro-rata applies
 * and the component it covers so the number is never mistaken for a definitive legal amount.
 */
export const ESTIMATE_CAVEAT =
  "Estimate only. Computed on the energy-charge component using the standard monthly pro-rata " +
  "(accumulated units ÷ billing months, each month at the telescopic slabs) required by MERC Supply " +
  "Code 2021, Reg. 16.1.1. Wheeling, fixed charges, fuel-adjustment and taxes are excluded. Verify " +
  "against your bill before relying on it — this is not a definitive legal figure.";

const round2 = (n: number): number => Math.round(n * 100) / 100;
/** MSEDCL bills to the nearest rupee (config.rounding); totals match that so our arithmetic reproduces the bill. */
const roundRupee = (n: number): number => Math.round(n);

/**
 * Telescopic energy charge for `units` under one slab table: each band charges only the units that fall
 * within it. Returns one `SlabCharge` per band actually reached (bands with zero units are omitted).
 */
function telescopic(units: number, slabs: TariffSlab[]): SlabCharge[] {
  const out: SlabCharge[] = [];
  for (const s of slabs) {
    const lower = s.fromUnit - 1; // units below this band
    const upper = s.toUnit ?? Infinity; // null = open-ended top band
    const unitsInBand = Math.max(0, Math.min(units, upper) - lower);
    if (unitsInBand <= 0) continue;
    out.push({
      fromUnit: s.fromUnit,
      toUnit: s.toUnit,
      units: unitsInBand,
      rate: s.energyCharge,
      charge: round2(unitsInBand * s.energyCharge),
    });
  }
  return out;
}

const sumCharge = (b: SlabCharge[]): number => b.reduce((acc, c) => acc + c.charge, 0);

/** Equivalent months the period spans, rounded to a whole month (min 1). ~30-day bill → 1; ~6-month → 6. */
function equivalentMonths(periodFrom: string, periodTo: string): number {
  const daysInclusive = Math.round((Date.parse(periodTo) - Date.parse(periodFrom)) / MS_PER_DAY) + 1;
  return Math.max(1, Math.round(daysInclusive / AVG_DAYS_PER_MONTH));
}

/** ISO (YYYY-MM-DD) midpoint of the i-th of `n` equal segments of [from,to] — used to pick each month's tariff. */
function monthMidpointISO(periodFrom: string, periodTo: string, i: number, n: number): string {
  const from = Date.parse(periodFrom);
  const span = Date.parse(periodTo) - from;
  return new Date(from + span * ((i + 0.5) / n)).toISOString().slice(0, 10);
}

/** A priceable version has real (non-draft-empty) slabs; FY2025-26 ships slabs:[] and is not priceable. */
const isPriceable = (v: TariffVersion | undefined): v is TariffVersion => !!v && v.slabs.length > 0;

function unsupportedResult(category: string, months: number): CalculationResult {
  return {
    actualEnergyCharge: 0,
    lawfulEnergyCharge: 0,
    overcharge: 0,
    actualBreakdown: [],
    lawfulBreakdown: [],
    tableLabel: "unsupported",
    estimateCaveat: `The "${category}" tariff is not supported yet — this tool currently covers ${tariff.category} only. No overcharge was computed.`,
    monthsInPeriod: months,
    unsupported: true,
  };
}

function outsideCoverageResult(months: number): CalculationResult {
  return {
    actualEnergyCharge: 0,
    lawfulEnergyCharge: 0,
    overcharge: 0,
    actualBreakdown: [],
    lawfulBreakdown: [],
    tableLabel: "outside verified tariff data",
    estimateCaveat: ESTIMATE_CAVEAT,
    monthsInPeriod: months,
    outsideVerifiedTariff: true,
  };
}

export const calculate: CalculateFn = (input: UserInput): CalculationResult => {
  const { unitsBilled, periodFrom, periodTo, category, energyChargeBilled } = input;

  if (
    typeof energyChargeBilled !== "number" ||
    !Number.isFinite(energyChargeBilled) ||
    energyChargeBilled <= 0
  ) {
    throw new Error(
      `calculate: energyChargeBilled must be a positive number, received ${energyChargeBilled}`
    );
  }

  // Decision 4: edge categories fail honestly, they are never computed.
  if (!isCategorySupported(category)) {
    return unsupportedResult(category, equivalentMonths(periodFrom, periodTo));
  }

  const months = equivalentMonths(periodFrom, periodTo);
  const unitsPerMonth = unitsBilled / months;

  // ---- Lawful: price each equivalent month at the version in force that month (straddle rule) ----
  // Aggregate the per-month breakdowns by (band, rate) so a single-version period collapses to a clean
  // slab-by-slab view; a straddle across a rate change keeps the two rates as separate lines.
  const lawfulByBand = new Map<string, SlabCharge>();
  const priceableVersions: TariffVersion[] = [];
  let lawful = 0;
  let anyUnpriceable = false;

  for (let i = 0; i < months; i++) {
    const version = getTariffVersionForDate(monthMidpointISO(periodFrom, periodTo, i, months));
    if (!isPriceable(version)) {
      anyUnpriceable = true; // before coverage boundary, or a draft window with empty slabs
      continue;
    }
    priceableVersions.push(version);
    const monthBreakdown = telescopic(unitsPerMonth, version.slabs);
    lawful += sumCharge(monthBreakdown);
    for (const sc of monthBreakdown) {
      const key = `${sc.fromUnit}|${sc.rate}`;
      const existing = lawfulByBand.get(key);
      if (existing) {
        existing.units = round2(existing.units + sc.units);
        existing.charge = round2(existing.charge + sc.charge);
      } else {
        lawfulByBand.set(key, { ...sc });
      }
    }
  }

  // Nothing in the period could be priced → flag and stop; never fabricate a figure (do-not-guess).
  if (priceableVersions.length === 0) {
    return outsideCoverageResult(months);
  }

  // ---- Actual: the lumped bill. Priced at the bill-date version, falling back to the latest priceable
  // month if the bill date itself is not priceable (partial-straddle safety). ----
  const billDateVersion = getTariffVersionForDate(periodTo);
  const actualVersion = isPriceable(billDateVersion)
    ? billDateVersion
    : priceableVersions[priceableVersions.length - 1];

  const actualBreakdown = telescopic(unitsBilled, actualVersion.slabs);
  const estimatedAsBilledEnergyCharge = roundRupee(sumCharge(actualBreakdown));
  const actualEnergyCharge = energyChargeBilled;
  const lawfulEnergyCharge = roundRupee(lawful);

  const mismatchRatio =
    estimatedAsBilledEnergyCharge > 0
      ? Math.abs(actualEnergyCharge - estimatedAsBilledEnergyCharge) / estimatedAsBilledEnergyCharge
      : 0;
  const energyChargeMismatch = mismatchRatio > 0.20;

  const lawfulBreakdown = [...lawfulByBand.values()].sort((a, b) => a.fromUnit - b.fromUnit);
  const tableLabel = [...new Set(priceableVersions.map((v) => v.label))].join(" / ");

  return {
    actualEnergyCharge,
    lawfulEnergyCharge,
    overcharge: Math.max(0, actualEnergyCharge - lawfulEnergyCharge),
    actualBreakdown,
    lawfulBreakdown,
    tableLabel,
    estimateCaveat: ESTIMATE_CAVEAT,
    monthsInPeriod: months,
    estimatedAsBilledEnergyCharge,
    energyChargeMismatch,
    // Part of the period fell before the coverage boundary or in a draft window — surfaced so the UI
    // can warn the figure covers only the priceable months.
    outsideVerifiedTariff: anyUnpriceable || undefined,
  };
};

export default calculate;
