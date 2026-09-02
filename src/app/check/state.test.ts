import { test, expect } from "vitest";
import {
  EMPTY_FORM,
  EMPTY_PRIOR_REF,
  buildUserInput,
  validateIntake,
  type FormState,
} from "./state";

// Pure form-mapping / validation logic behind the intake screen (T7). Runs in the node env like the
// rest of the suite — no React here.

function form(overrides: Partial<FormState>): FormState {
  return { ...EMPTY_FORM, ...overrides };
}

const VALID: Partial<FormState> = {
  unitsBilled: "150",
  periodFrom: "2026-04-01",
  periodTo: "2026-09-30",
  readingType: "actual",
  category: "LT-I-B-residential",
};

test("validateIntake passes a complete, well-formed intake", () => {
  expect(validateIntake(form(VALID))).toEqual({});
});

test("validateIntake flags missing required fields", () => {
  const errors = validateIntake(EMPTY_FORM); // category is pre-filled; the rest are blank
  expect(errors.unitsBilled).toBeTruthy();
  expect(errors.periodFrom).toBeTruthy();
  expect(errors.periodTo).toBeTruthy();
  expect(errors.readingType).toBeTruthy();
  expect(errors.category).toBeUndefined(); // EMPTY_FORM pre-selects the supported category
});

test("validateIntake rejects zero / non-positive units", () => {
  expect(validateIntake(form({ ...VALID, unitsBilled: "0" })).unitsBilled).toBeTruthy();
  expect(validateIntake(form({ ...VALID, unitsBilled: "-5" })).unitsBilled).toBeTruthy();
  expect(validateIntake(form({ ...VALID, unitsBilled: "abc" })).unitsBilled).toBeTruthy();
});

test("validateIntake rejects an end date before the start date", () => {
  expect(
    validateIntake(form({ ...VALID, periodFrom: "2026-09-30", periodTo: "2026-04-01" })).periodTo
  ).toBeTruthy();
});

test("buildUserInput maps strings to typed UserInput and collapses blanks to undefined", () => {
  const input = buildUserInput(
    form({ ...VALID, amountBilled: "", circle: "  ", meterType: "", priorMonthlyAvgUnits: "" })
  );
  expect(input.unitsBilled).toBe(150);
  expect(input.readingType).toBe("actual");
  expect(input.amountBilled).toBeUndefined();
  expect(input.circle).toBeUndefined();
  expect(input.meterType).toBeUndefined();
  expect(input.priorMonthlyAvgUnits).toBeUndefined();
  expect(input.priorTierRef).toBeUndefined();
});

test("buildUserInput parses optional numbers and the meter/reading enums", () => {
  const input = buildUserInput(
    form({
      ...VALID,
      amountBilled: "4200",
      readingType: "estimated",
      meterType: "smart",
      priorMonthlyAvgUnits: "80",
      recentMeterSwap: true,
    })
  );
  expect(input.amountBilled).toBe(4200);
  expect(input.readingType).toBe("estimated");
  expect(input.meterType).toBe("smart");
  expect(input.priorMonthlyAvgUnits).toBe(80);
  expect(input.recentMeterSwap).toBe(true);
});

test("buildUserInput threads declaredStage and a usable prior-tier ref through", () => {
  const input = buildUserInput(form(VALID), "cgrf_rejected", {
    referenceNo: "  CGRF/2026/123  ",
    date: "2026-08-01",
    outcome: "rejected",
  });
  expect(input.declaredStage).toBe("cgrf_rejected");
  expect(input.priorTierRef).toEqual({
    referenceNo: "CGRF/2026/123",
    date: "2026-08-01",
    outcome: "rejected",
  });
});

test("buildUserInput drops a prior-tier ref with a blank reference number", () => {
  const input = buildUserInput(form(VALID), "icrs_ignored", {
    ...EMPTY_PRIOR_REF,
    date: "2026-08-01",
  });
  expect(input.priorTierRef).toBeUndefined();
});
