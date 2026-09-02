import { test, expect } from "vitest";
import { runVertical } from "./runVertical";
import { msedclElectricitySpec } from "./verticals/msedcl-electricity/spec";
import type { UserInput } from "./types";

// External-behaviour tests for the pipeline seam: given the real MSEDCL spec as data + an input fixture,
// runVertical returns the right envelope. We assert the diagnosis/calc/tier/instrument selection, not
// any internal step. An actionable case needs a positive overcharge → 150 units over ~6 months.

function actionable(overrides: Partial<UserInput> = {}): UserInput {
  return {
    unitsBilled: 150,
    periodFrom: "2026-04-01",
    periodTo: "2026-09-30",
    readingType: "actual",
    category: "LT-I-B-residential",
    ...overrides,
  };
}

test("actionable bill, declaredStage 'new' → ICRS tier + calculation present", () => {
  const r = runVertical(msedclElectricitySpec, actionable({ declaredStage: "new" }));
  expect(r.diagnosis.isActionable).toBe(true);
  expect(r.calculation).not.toBeNull();
  expect(r.calculation?.overcharge).toBeGreaterThan(0);
  expect(r.tier?.instrument).toBe("icrs");
  expect(r.instrument).toBe("icrs");
  expect(r.error).toBeUndefined();
  expect(r.evidence).toBe(msedclElectricitySpec.evidenceChecklist);
});

test("no declaredStage defaults to the first-contact rung (ICRS)", () => {
  const r = runVertical(msedclElectricitySpec, actionable());
  expect(r.tier?.instrument).toBe("icrs");
  expect(r.instrument).toBe("icrs");
});

test("empty-string declaredStage is normalized and defaults to ICRS", () => {
  const r = runVertical(msedclElectricitySpec, actionable({ declaredStage: "  " }));
  expect(r.instrument).toBe("icrs");
});

test("declaredStage 'icrs_ignored' with a prior-tier ref → CGRF Schedule A", () => {
  const r = runVertical(
    msedclElectricitySpec,
    actionable({
      declaredStage: "icrs_ignored",
      priorTierRef: { referenceNo: "ICRS/2026/12345", date: "2026-07-01", outcome: "no response" },
    }),
  );
  expect(r.tier?.instrument).toBe("cgrf-schedule-a");
  expect(r.instrument).toBe("cgrf-schedule-a");
  expect(r.error).toBeUndefined();
});

test("declaredStage 'cgrf_rejected' with a prior-tier ref → Ombudsman Schedule B", () => {
  const r = runVertical(
    msedclElectricitySpec,
    actionable({
      declaredStage: "cgrf_rejected",
      priorTierRef: { referenceNo: "CGRF/PZ/2026/77", date: "2026-08-10", outcome: "rejected" },
    }),
  );
  expect(r.tier?.instrument).toBe("ombudsman-schedule-b");
  expect(r.instrument).toBe("ombudsman-schedule-b");
});

test("tier requiring a prior-tier ref fails cleanly when the ref is missing", () => {
  const r = runVertical(msedclElectricitySpec, actionable({ declaredStage: "icrs_ignored" }));
  expect(r.instrument).toBeNull(); // document withheld
  expect(r.tier?.instrument).toBe("cgrf-schedule-a"); // but the selected rung is still reported for context
  expect(r.error?.code).toBe("missing_prior_tier_ref");
  expect(r.error?.tier).toBe("cgrf-schedule-a");
});

test("a blank prior-tier reference number does not satisfy the requirement", () => {
  const r = runVertical(
    msedclElectricitySpec,
    actionable({ declaredStage: "icrs_ignored", priorTierRef: { referenceNo: "   ", date: "2026-07-01" } }),
  );
  expect(r.instrument).toBeNull();
  expect(r.error?.code).toBe("missing_prior_tier_ref");
});

test("genuine bill (not actionable) → no tier, no instrument, no error, calc still returned", () => {
  const r = runVertical(
    msedclElectricitySpec,
    actionable({ unitsBilled: 250, periodFrom: "2026-05-01", periodTo: "2026-05-31", declaredStage: "new" }),
  );
  expect(r.diagnosis.isActionable).toBe(false);
  expect(r.tier).toBeNull();
  expect(r.instrument).toBeNull();
  expect(r.error).toBeUndefined();
  expect(r.calculation).not.toBeNull();
});

test("tier selection never lands on the RTI sidecar", () => {
  const r = runVertical(msedclElectricitySpec, actionable({ declaredStage: "rti" }));
  expect(r.tier).toBeNull();
  expect(r.instrument).toBeNull();
});
