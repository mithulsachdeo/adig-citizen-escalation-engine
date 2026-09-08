import { describe, it, expect } from "vitest";
import {
  validateUnits,
  validateAmount,
  validateDates,
  validateEnergyCharge,
  applyPlausibilityGating,
} from "./plausibility";

describe("Plausibility Gating", () => {
  describe("validateUnits", () => {
    it("accepts plausible units within reading difference calculation", () => {
      // current=21375, previous=21208 -> diff = 167
      const valid = validateUnits(167, 21375, 21208, 1);
      expect(valid).toBe(167);
    });

    it("rejects currentReading mistaken as unitsBilled (e.g. 21375 instead of 167)", () => {
      // OCR mistakenly picks the current meter reading 21375 as units
      const rejected = validateUnits(21375, 21375, 21208, 1);
      expect(rejected).toBeUndefined();
    });

    it("accepts units when readings are absent if within plausible range", () => {
      expect(validateUnits(350)).toBe(350);
      expect(validateUnits(50)).toBe(50);
      expect(validateUnits(15000)).toBe(15000);
    });

    it("rejects non-positive or astronomical units", () => {
      expect(validateUnits(0)).toBeUndefined();
      expect(validateUnits(-20)).toBeUndefined();
      expect(validateUnits(150000)).toBeUndefined();
    });
  });

  describe("validateAmount", () => {
    it("accepts valid residential amounts", () => {
      expect(validateAmount(2150)).toBe(2150);
      expect(validateAmount(3830.5)).toBe(3830.5);
    });

    it("rejects <= 0 or >= 100000 amounts", () => {
      expect(validateAmount(0)).toBeUndefined();
      expect(validateAmount(-100)).toBeUndefined();
      expect(validateAmount(100000)).toBeUndefined();
      expect(validateAmount(250000)).toBeUndefined();
    });
  });

  describe("validateDates", () => {
    it("accepts valid dates spanning ~15-60 days within recent years", () => {
      const res = validateDates("2024-07-01", "2024-08-01");
      expect(res.periodFrom).toBe("2024-07-01");
      expect(res.periodTo).toBe("2024-08-01");
    });

    it("drops both dates if year is too old (e.g., year 2006 misread)", () => {
      const res = validateDates("2006-01-01", "2006-02-01");
      expect(res.periodFrom).toBeUndefined();
      expect(res.periodTo).toBeUndefined();
    });

    it("drops both dates if periodFrom >= periodTo", () => {
      const res = validateDates("2024-08-01", "2024-07-01");
      expect(res.periodFrom).toBeUndefined();
      expect(res.periodTo).toBeUndefined();
    });

    it("drops both dates if span is outside 15-60 days (e.g. 5 days or 180 days)", () => {
      const tooShort = validateDates("2024-07-01", "2024-07-05");
      expect(tooShort.periodFrom).toBeUndefined();
      expect(tooShort.periodTo).toBeUndefined();

      const tooLong = validateDates("2024-01-01", "2024-08-01");
      expect(tooLong.periodFrom).toBeUndefined();
      expect(tooLong.periodTo).toBeUndefined();
    });
  });

  describe("validateEnergyCharge", () => {
    it("accepts energy charge <= amountBilled", () => {
      expect(validateEnergyCharge(1099.08, 2150)).toBe(1099.08);
    });

    it("rejects energy charge > amountBilled", () => {
      expect(validateEnergyCharge(3500, 2150)).toBeUndefined();
    });

    it("rejects non-positive energy charge", () => {
      expect(validateEnergyCharge(0, 2150)).toBeUndefined();
      expect(validateEnergyCharge(-50, 2150)).toBeUndefined();
    });
  });

  describe("applyPlausibilityGating", () => {
    it("gating cleans up raw extracted bill fields", () => {
      const raw = {
        unitsBilled: 21375, // invalid because current=21375, prev=21208
        currentReading: 21375,
        previousReading: 21208,
        amountBilled: 2150,
        periodFrom: "2026-07-22",
        periodTo: "2026-08-22",
        energyChargeBilled: 1099.08,
        readingType: "actual" as const,
        source: "pdf" as const,
        confidence: "high" as const,
        fieldsFilled: 5,
      };

      const gated = applyPlausibilityGating(raw);
      expect(gated.unitsBilled).toBeUndefined();
      expect(gated.amountBilled).toBe(2150);
      expect(gated.periodFrom).toBe("2026-07-22");
      expect(gated.periodTo).toBe("2026-08-22");
      expect(gated.energyChargeBilled).toBe(1099.08);
      expect(gated.energyChargeVerifyRequired).toBe(true);
    });
  });
});
