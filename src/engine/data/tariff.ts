// Typed loader for the MSEDCL LT-residential tariff config.
//
// The JSON (tariff-msedcl-residential.json) is config we OWN — never user input (spec D12).
// Source of truth: MERC Order Case No. 75 of 2025 (final 25 Mar 2026). Overcharge is computed on the
// ENERGY-CHARGE component ONLY (wheeling is flat across slabs → undistorted; spec D14). FY2026-27 is
// `verified`; FY2025-26 slabs are still `draft` (OCR-garbled — re-transcribe before any calc uses them).
//
// Loaded via `resolveJsonModule`. The cast goes through `unknown` because the JSON carries extra
// annotation keys (_comment, referenceOnly_*, per-version note) that the typed shape intentionally omits.

import raw from "./tariff-msedcl-residential.json";
import type { Confidence } from "../types";

/** One telescopic slab. `energyCharge` is the only field the calc engine uses; the rest document the bill line. */
export interface TariffSlab {
  fromUnit: number;
  /** null = open-ended top slab (e.g. 501+). */
  toUnit: number | null;
  energyCharge: number;
  wheeling: number;
  totalVariable: number;
}

/** A tariff version, effective over [effectiveFrom, effectiveTo]. Straddling periods apply the version per equivalent month (spec: straddleRule). */
export interface TariffVersion {
  label: string;
  /** ISO date the version takes effect. */
  effectiveFrom: string;
  /** ISO date the version stops applying. */
  effectiveTo: string;
  confidence: Confidence;
  fixedChargeSinglePhaseRsPerMonth?: number;
  fixedChargeThreePhaseRsPerMonth?: number;
  wheelingChargeRsPerUnit?: number;
  /** May be empty for a `draft` version whose slabs are not yet transcribed. */
  slabs: TariffSlab[];
  note?: string;
}

export interface TariffConfig {
  vertical: string;
  /** Supported category, e.g. "LT-I-B-residential". */
  category: string;
  /** Bill component overcharge is computed on. Always "energyCharge" in v1. */
  computeComponent: string;
  unit: string;
  telescopic: boolean;
  source: string;
  /** Periods before this ISO date fall under a prior order not loaded here — flag, don't guess. */
  coverageBoundaryFrom: string;
  coverageNote: string;
  straddleRule: string;
  excludedFromOvercharge: string[];
  rounding: string;
  versions: TariffVersion[];
  /** Categories the slab-jump math does not apply to; the tool must say "not supported yet". */
  unsupportedCategories: Record<string, string>;
}

export const tariff: TariffConfig = raw as unknown as TariffConfig;

/** Earliest date the loaded tariff data covers. Portions of a bill period before this are "outside verified tariff data". */
export const COVERAGE_BOUNDARY_FROM: string = tariff.coverageBoundaryFrom;

/**
 * The tariff version in force on an ISO date (YYYY-MM-DD), or undefined if the date is outside
 * all loaded windows. Used per equivalent month for straddling periods (T4).
 */
export function getTariffVersionForDate(isoDate: string): TariffVersion | undefined {
  return tariff.versions.find((v) => isoDate >= v.effectiveFrom && isoDate <= v.effectiveTo);
}

/** True if the calc engine supports this consumer category (i.e. it is the config's residential category). */
export function isCategorySupported(category: string): boolean {
  return category === tariff.category;
}
