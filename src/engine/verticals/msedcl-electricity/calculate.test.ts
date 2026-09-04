import { test, expect } from "vitest";
import { calculate } from "./calculate";
import type { UserInput } from "../../types";

// Table-driven coverage for the pro-rata overcharge engine (T3). The mechanism (spec D14 +
// tariff-config-notes): overcharge = actual lumped energy charge − lawful monthly-equivalent
// pro-rata energy charge, ENERGY-CHARGE component only, telescopic slabs, per-equivalent-month.

/** Minimal valid residential input; each test overrides the fields it cares about. */
function input(overrides: Partial<UserInput>): UserInput {
  return {
    unitsBilled: 0,
    periodFrom: "2026-05-01",
    periodTo: "2026-05-31",
    amountBilled: 1000,
    energyChargeBilled: 0,
    readingType: "actual",
    category: "LT-I-B-residential",
    ...overrides,
  };
}

test("slab-jump: 150 units lumped as a ~6-month bill yields a positive overcharge (documented split)", () => {
  // 150 units over 6 equivalent months = 25 units/equivalent-month → all in slab 1 (@3.96).
  // Lawful  = 6 × (25 × 3.96)                     = 6 × 99   = 594
  // Actual  = 100×3.96 + 50×10.80 (lumped 150)    = 396+540  = 936
  // Overcharge (energy-charge only)                          = 342
  const r = calculate(
    input({ unitsBilled: 150, periodFrom: "2026-04-01", periodTo: "2026-09-30", energyChargeBilled: 936 })
  );

  expect(r.monthsInPeriod).toBe(6);
  expect(r.actualEnergyCharge).toBe(936);
  expect(r.estimatedAsBilledEnergyCharge).toBe(936);
  expect(r.energyChargeMismatch).toBe(false);
  expect(r.lawfulEnergyCharge).toBe(594);
  expect(r.overcharge).toBe(342);
  expect(r.tableLabel).toBe("FY2026-27");
  expect(r.outsideVerifiedTariff).toBeFalsy();
  expect(r.unsupported).toBeFalsy();
  expect(r.estimateCaveat).toContain("16.1.1");

  // Lawful breakdown collapses to the single slab actually reached each month.
  expect(r.lawfulBreakdown).toEqual([
    { fromUnit: 1, toUnit: 100, units: 150, rate: 3.96, charge: 594 },
  ]);
  // Actual (lumped) breakdown crosses into slab 2 — that is the distortion the engine surfaces.
  expect(r.actualBreakdown).toEqual([
    { fromUnit: 1, toUnit: 100, units: 100, rate: 3.96, charge: 396 },
    { fromUnit: 101, toUnit: 300, units: 50, rate: 10.8, charge: 540 },
  ]);
});

test("overcharge is computed directly from citizen's energyChargeBilled rather than ideal simulation", () => {
  // Citizen was billed 1100 energy charge instead of ideal 936
  const r = calculate(
    input({ unitsBilled: 150, periodFrom: "2026-04-01", periodTo: "2026-09-30", energyChargeBilled: 1100 })
  );
  expect(r.actualEnergyCharge).toBe(1100);
  expect(r.estimatedAsBilledEnergyCharge).toBe(936);
  expect(r.lawfulEnergyCharge).toBe(594);
  expect(r.overcharge).toBe(506); // 1100 - 594
});

test("energyChargeMismatch fires when deviation exceeds 20% and stays false within 20%", () => {
  // 150 units -> estimated 936
  // Deviation > 20%: 1150 vs 936 is (1150-936)/936 = 22.8%
  const high = calculate(
    input({ unitsBilled: 150, periodFrom: "2026-04-01", periodTo: "2026-09-30", energyChargeBilled: 1150 })
  );
  expect(high.energyChargeMismatch).toBe(true);

  // Deviation <= 20%: 1000 vs 936 is (1000-936)/936 = 6.8%
  const ok = calculate(
    input({ unitsBilled: 150, periodFrom: "2026-04-01", periodTo: "2026-09-30", energyChargeBilled: 1000 })
  );
  expect(ok.energyChargeMismatch).toBe(false);
});

test("normal ~30-day Actual single-month bill → overcharge 0", () => {
  // 250 units in one actual month: lumped == pro-rata (months = 1), so no distortion.
  const r = calculate(
    input({ unitsBilled: 250, periodFrom: "2026-05-01", periodTo: "2026-05-31", energyChargeBilled: 2016 })
  );
  expect(r.monthsInPeriod).toBe(1);
  expect(r.actualEnergyCharge).toBe(r.lawfulEnergyCharge);
  expect(r.overcharge).toBe(0);
});

test("high-usage but Actual single-month bill → overcharge 0 (legitimate, not slab-jump)", () => {
  // 700 units is high, but a genuine single-month actual read is lawful — no pro-rata benefit.
  const r = calculate(
    input({ unitsBilled: 700, periodFrom: "2026-06-01", periodTo: "2026-06-30", energyChargeBilled: 7236 })
  );
  expect(r.monthsInPeriod).toBe(1);
  expect(r.overcharge).toBe(0);
});

test("slab-boundary: 600 units over ~6 months exercises all four slabs on the lumped side", () => {
  // 600/6 = 100 units/equivalent-month → exactly fills slab 1 each month.
  // Lawful  = 6 × (100 × 3.96)                                        = 6 × 396 = 2376
  // Actual  = 100×3.96 + 200×10.80 + 200×15.03 + 100×17.53 (lumped 600)
  //         = 396 + 2160 + 3006 + 1753                                 = 7315
  // Overcharge                                                          = 4939
  const r = calculate(
    input({ unitsBilled: 600, periodFrom: "2026-04-01", periodTo: "2026-09-30", energyChargeBilled: 7315 })
  );
  expect(r.monthsInPeriod).toBe(6);
  expect(r.lawfulEnergyCharge).toBe(2376);
  expect(r.actualEnergyCharge).toBe(7315);
  expect(r.overcharge).toBe(4939);
  expect(r.actualBreakdown).toHaveLength(4);
  expect(r.actualBreakdown[3]).toEqual({ fromUnit: 501, toUnit: null, units: 100, rate: 17.53, charge: 1753 });
});

test("config selection picks the FY2026-27 version by bill date", () => {
  const r = calculate(input({ unitsBilled: 120, periodFrom: "2026-12-01", periodTo: "2026-12-31" }));
  expect(r.tableLabel).toBe("FY2026-27");
  expect(r.outsideVerifiedTariff).toBeFalsy();
});

test("pre-2025-07 period flags 'outside verified tariff data' and does not guess", () => {
  const r = calculate(input({ unitsBilled: 300, periodFrom: "2025-01-01", periodTo: "2025-01-31" }));
  expect(r.outsideVerifiedTariff).toBe(true);
  expect(r.overcharge).toBe(0);
  expect(r.actualEnergyCharge).toBe(0);
  expect(r.tableLabel).toBe("outside verified tariff data");
});

test("draft FY2025-26 window (empty slabs) is not computed — flagged, not guessed", () => {
  // FY2025-26 exists in config but ships with slabs:[] (OCR-garbled → draft). Never fabricate a figure.
  const r = calculate(input({ unitsBilled: 300, periodFrom: "2025-08-01", periodTo: "2025-08-31" }));
  expect(r.outsideVerifiedTariff).toBe(true);
  expect(r.overcharge).toBe(0);
});

test("BPL category → unsupported result (does not compute)", () => {
  const r = calculate(input({ unitsBilled: 400, category: "LT-I-A-BPL", periodFrom: "2026-04-01", periodTo: "2026-09-30" }));
  expect(r.unsupported).toBe(true);
  expect(r.overcharge).toBe(0);
  expect(r.actualEnergyCharge).toBe(0);
  expect(r.tableLabel).toBe("unsupported");
});
