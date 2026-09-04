import { test, expect } from "vitest";
import { diagnose, CLASSIFICATION } from "./diagnose";
import type { UserInput } from "../../types";

// Diagnosis rules (spec D19). Amounts reuse the FY2026-27 fixtures verified in calculate.test.ts:
// 150 units lumped over 6 equivalent months yields a positive pro-rata overcharge; a ~30-day actual
// bill never does. We assert the CLASSIFICATION and isActionable — the rupee figure is calculate's job.

function input(overrides: Partial<UserInput>): UserInput {
  return {
    unitsBilled: 0,
    periodFrom: "2026-05-01",
    periodTo: "2026-05-31",
    amountBilled: 1000,
    energyChargeBilled: 2016,
    readingType: "actual",
    category: "LT-I-B-residential",
    ...overrides,
  };
}

/** A long accumulation period with a real positive overcharge. */
const sixMonth = { periodFrom: "2026-04-01", periodTo: "2026-09-30", energyChargeBilled: 936 } as const;

test("long actual accumulation period with positive overcharge → slab_jump (actionable)", () => {
  const r = diagnose(input({ unitsBilled: 150, ...sixMonth }));
  expect(r.classification).toBe(CLASSIFICATION.SLAB_JUMP);
  expect(r.isActionable).toBe(true);
});

test("estimated reading over an accumulation window → average_billing (actionable)", () => {
  const r = diagnose(input({ unitsBilled: 150, readingType: "estimated", ...sixMonth }));
  expect(r.classification).toBe(CLASSIFICATION.AVERAGE_BILLING);
  expect(r.isActionable).toBe(true);
});

test("normal ~30-day actual bill → legitimate (not actionable)", () => {
  const r = diagnose(input({ unitsBilled: 250, periodFrom: "2026-05-01", periodTo: "2026-05-31", energyChargeBilled: 2016 }));
  expect(r.classification).toBe(CLASSIFICATION.LEGITIMATE);
  expect(r.isActionable).toBe(false);
});

test("high-usage but genuine single-month actual bill → legitimate (spec story 5)", () => {
  const r = diagnose(input({ unitsBilled: 700, periodFrom: "2026-06-01", periodTo: "2026-06-30", energyChargeBilled: 7236 }));
  expect(r.classification).toBe(CLASSIFICATION.LEGITIMATE);
  expect(r.isActionable).toBe(false);
});

test("estimated but single-cycle period (no accumulation benefit) → legitimate", () => {
  // Estimated reading, ~30 days: months = 1, so lumped == pro-rata → overcharge 0.
  const r = diagnose(
    input({ unitsBilled: 300, readingType: "estimated", periodFrom: "2026-05-01", periodTo: "2026-05-31", energyChargeBilled: 2556 })
  );
  expect(r.classification).toBe(CLASSIFICATION.LEGITIMATE);
  expect(r.isActionable).toBe(false);
});

test("recent meter swap with a catch-up overcharge → smart_meter_catch_up (actionable)", () => {
  const r = diagnose(input({ unitsBilled: 150, recentMeterSwap: true, meterType: "smart", ...sixMonth }));
  expect(r.classification).toBe(CLASSIFICATION.SMART_METER_CATCH_UP);
  expect(r.isActionable).toBe(true);
});

test("recent meter swap but genuine single-month reading → legitimate (not actionable)", () => {
  const r = diagnose(
    input({ unitsBilled: 250, recentMeterSwap: true, meterType: "smart", periodFrom: "2026-05-01", periodTo: "2026-05-31", energyChargeBilled: 2016 })
  );
  expect(r.classification).toBe(CLASSIFICATION.LEGITIMATE);
  expect(r.isActionable).toBe(false);
});

test("unsupported category (BPL) → unsupported (not actionable)", () => {
  const r = diagnose(input({ unitsBilled: 400, category: "LT-I-A-BPL", ...sixMonth }));
  expect(r.classification).toBe(CLASSIFICATION.UNSUPPORTED);
  expect(r.isActionable).toBe(false);
});

test("accumulation period outside verified tariff data → legitimate (nothing priceable, no false claim)", () => {
  // Pre-coverage-boundary long period: calc returns overcharge 0 (flagged outside), so we must not
  // assert an overbilling we cannot compute.
  const r = diagnose(input({ unitsBilled: 600, periodFrom: "2025-01-01", periodTo: "2025-06-30", energyChargeBilled: 7315 }));
  expect(r.classification).toBe(CLASSIFICATION.LEGITIMATE);
  expect(r.isActionable).toBe(false);
});
