import { test, expect } from "vitest";
import { formatOverchargeAnnexure } from "./annexure";
import { assembleInstrument } from "./assembleInstrument";
import { INSTRUMENT_TEMPLATES } from "./templates";
import type { CalculationResult } from "../types";

const CALC: CalculationResult = {
  actualEnergyCharge: 1120,
  lawfulEnergyCharge: 661,
  overcharge: 459,
  actualBreakdown: [
    { fromUnit: 1, toUnit: 100, units: 100, rate: 3.96, charge: 396 },
    { fromUnit: 101, toUnit: 300, units: 200, rate: 10.8, charge: 2160 },
  ],
  lawfulBreakdown: [{ fromUnit: 1, toUnit: 100, units: 300, rate: 3.96, charge: 1188 }],
  tableLabel: "FY2026-27",
  estimateCaveat:
    "Estimate only. Computed on the energy-charge component per MERC Supply Code 2021, Reg. 16.1.1.",
  monthsInPeriod: 6,
};

test("annexure carries the heading, tariff, both subtotals, the difference and the caveat", () => {
  const a = formatOverchargeAnnexure(CALC);
  expect(a).toContain("ANNEXURE A - OVERCHARGE CALCULATION (tariff FY2026-27)");
  expect(a).toContain("Subtotal (energy charge): Rs 1,120");
  expect(a).toContain("Subtotal (energy charge): Rs 661");
  expect(a).toContain("= Rs 459");
  expect(a).toContain("Reg. 16.1.1");
  expect(a).toContain("1–100"); // a slab band label
  expect(a).toContain("6 equivalent month");
});

test("assembleInstrument appends the annexure and references it from the body when present", () => {
  const facts = { overchargeEstimate: 459, overchargeAnnexure: formatOverchargeAnnexure(CALC) };
  const withAnnexure = assembleInstrument(INSTRUMENT_TEMPLATES["icrs"], facts, "stub narrative");
  expect(withAnnexure.body).toContain("Annexure A"); // body reference
  expect(withAnnexure.body).toContain("ANNEXURE A - OVERCHARGE CALCULATION"); // the appended section
});

test("no annexure => no Annexure A reference (unchanged behaviour)", () => {
  const without = assembleInstrument(INSTRUMENT_TEMPLATES["icrs"], { overchargeEstimate: 459 }, "stub narrative");
  expect(without.body).not.toContain("Annexure A");
});

test("submission copy strips the self-help disclaimer and the estimate caveat; on-screen body keeps both", () => {
  const facts = {
    overchargeEstimate: 459,
    overchargeAnnexure: formatOverchargeAnnexure(CALC),
    overchargeCaveat: CALC.estimateCaveat,
  };
  const a = assembleInstrument(INSTRUMENT_TEMPLATES["icrs"], facts, "stub narrative");

  // On-screen body keeps the hedges.
  expect(a.body).toContain(a.disclaimer);
  expect(a.body).toContain(CALC.estimateCaveat);

  // Submission copy drops both hedges…
  expect(a.bodyForSubmission).not.toContain(a.disclaimer);
  expect(a.bodyForSubmission).not.toContain(CALC.estimateCaveat);
  // …but keeps the letter itself, including the annexure and its legal grounds.
  expect(a.bodyForSubmission).toContain("ANNEXURE A - OVERCHARGE CALCULATION");
  expect(a.bodyForSubmission).toContain("Legal grounds:");
});
