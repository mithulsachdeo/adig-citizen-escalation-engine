import { test, expect } from "vitest";
import { tariff, getTariffVersionForDate, isCategorySupported } from "./tariff";

// Real (if small) coverage for the T2 loader: the config parses to the typed shape and the
// verified FY2026-27 slabs match the source order exactly.
test("tariff loader exposes the verified FY2026-27 residential slabs", () => {
  expect(tariff.category).toBe("LT-I-B-residential");
  expect(tariff.computeComponent).toBe("energyCharge");

  const fy2627 = getTariffVersionForDate("2026-06-15");
  expect(fy2627?.label).toBe("FY2026-27");
  expect(fy2627?.confidence).toBe("verified");
  expect(fy2627?.slabs).toHaveLength(4);
  // First telescopic slab: 1–100 units @ Rs 3.96/unit energy charge (MERC Case 75 of 2025).
  expect(fy2627?.slabs[0]).toMatchObject({ fromUnit: 1, toUnit: 100, energyCharge: 3.96 });
  // Top slab is open-ended.
  expect(fy2627?.slabs[3].toUnit).toBeNull();

  expect(isCategorySupported("LT-I-B-residential")).toBe(true);
  expect(isCategorySupported("LT-I-A-BPL")).toBe(false);
});
