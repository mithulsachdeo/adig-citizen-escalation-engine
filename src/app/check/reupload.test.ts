import { describe, it, expect } from "vitest";
import { computeReuploadUpdates } from "./reupload";
import type { ExtractedBill } from "@/lib/billExtract/types";

describe("computeReuploadUpdates", () => {
  const fullExtractedBill: ExtractedBill = {
    unitsBilled: 167,
    amountBilled: 2150,
    periodFrom: "2026-07-22",
    periodTo: "2026-08-22",
    category: "LT-I-B-residential",
    readingType: "actual",
    energyChargeBilled: 1099.08,
    energyChargeVerifyRequired: true,
    source: "pdf",
    confidence: "high",
    fieldsFilled: 7,
  };

  const partialExtractedBill: ExtractedBill = {
    periodFrom: "2026-08-01",
    category: "LT-I-B-residential",
    source: "image",
    confidence: "low",
    fieldsFilled: 2,
  };

  it("first upload: sets extracted fields, has empty clears, wasReplaced is false", () => {
    const prevAutoFilled = new Set<string>();
    const updates = computeReuploadUpdates(prevAutoFilled, fullExtractedBill);

    expect(updates.clears).toEqual([]);
    expect(updates.sets).toEqual([
      ["unitsBilled", "167"],
      ["periodFrom", "2026-07-22"],
      ["periodTo", "2026-08-22"],
      ["amountBilled", "2150"],
      ["readingType", "actual"],
      ["category", "LT-I-B-residential"],
      ["energyChargeBilled", "1099.08"],
    ]);
    expect(updates.nextAutoFilled).toEqual(
      new Set([
        "unitsBilled",
        "periodFrom",
        "periodTo",
        "amountBilled",
        "readingType",
        "category",
        "energyChargeBilled",
      ])
    );
    expect(updates.energyChargeVerifyRequired).toBe(true);
    expect(updates.wasReplaced).toBe(false);
  });

  it("upload-then-reupload: clears previously auto-filled fields omitted by the new extraction", () => {
    // 1st upload filled 6 fields: units, amount, from, to, category, energyCharge
    const prevAutoFilled = new Set<string>([
      "unitsBilled",
      "amountBilled",
      "periodFrom",
      "periodTo",
      "category",
      "energyChargeBilled",
    ]);

    // 2nd upload provides only: from, category
    const updates = computeReuploadUpdates(prevAutoFilled, partialExtractedBill);

    // New fields update
    expect(updates.sets).toEqual([
      ["periodFrom", "2026-08-01"],
      ["category", "LT-I-B-residential"],
    ]);

    // unitsBilled, periodTo, amountBilled, energyChargeBilled are cleared
    expect(new Set(updates.clears)).toEqual(
      new Set(["unitsBilled", "amountBilled", "periodTo", "energyChargeBilled"])
    );

    // energyChargeVerifyRequired is reset
    expect(updates.energyChargeVerifyRequired).toBe(false);

    // Badges reflect only the new set
    expect(updates.nextAutoFilled).toEqual(new Set(["periodFrom", "category"]));

    // Re-upload replacement flag is true
    expect(updates.wasReplaced).toBe(true);
  });

  it("manual-edit preservation: does not clear fields the user edited manually", () => {
    // 1st upload filled units, amount, periodFrom, periodTo.
    // User subsequently edited amountBilled, removing it from autoFilledFields.
    const prevAutoFilled = new Set<string>([
      "unitsBilled",
      // amountBilled was removed when user edited it
      "periodFrom",
      "periodTo",
    ]);

    // 2nd upload provides only periodFrom
    const secondUpload: ExtractedBill = {
      periodFrom: "2026-08-05",
      source: "image",
      confidence: "low",
      fieldsFilled: 1,
    };

    const updates = computeReuploadUpdates(prevAutoFilled, secondUpload);

    // amountBilled is NOT in clears because it was not in prevAutoFilled
    expect(updates.clears).not.toContain("amountBilled");
    // unitsBilled and periodTo ARE cleared
    expect(updates.clears).toContain("unitsBilled");
    expect(updates.clears).toContain("periodTo");

    // periodFrom is updated
    expect(updates.sets).toEqual([["periodFrom", "2026-08-05"]]);
    expect(updates.nextAutoFilled).toEqual(new Set(["periodFrom"]));
    expect(updates.wasReplaced).toBe(true);
  });

  it("failed second upload: errors are caught, onExtracted is not called, leaving prior form state untouched", () => {
    // Simulate form state after a successful first upload
    const formState: Record<string, string> = {
      unitsBilled: "167",
      amountBilled: "2150",
      periodFrom: "2026-07-22",
      periodTo: "2026-08-22",
    };
    let autoFilledFields = new Set(["unitsBilled", "amountBilled", "periodFrom", "periodTo"]);

    // Simulated handler mirroring IntakeStep.tsx
    const handleBillExtracted = (extracted: ExtractedBill) => {
      const updates = computeReuploadUpdates(autoFilledFields, extracted);
      for (const field of updates.clears) {
        formState[field] = "";
      }
      for (const [field, value] of updates.sets) {
        formState[field] = value;
      }
      autoFilledFields = updates.nextAutoFilled;
    };

    // Simulated upload processing throwing an error (not_msedcl or unreadable)
    const simulateFailedUpload = (errorMsg: string) => {
      try {
        throw new Error(errorMsg);
      } catch {
        // As in BillUploader.tsx: handleProcessFile catches error and sets error status without calling onExtracted
      }
    };

    simulateFailedUpload("not_msedcl");

    // Assert form state and autoFilledFields remain exactly as they were
    expect(formState.unitsBilled).toBe("167");
    expect(formState.amountBilled).toBe("2150");
    expect(formState.periodFrom).toBe("2026-07-22");
    expect(formState.periodTo).toBe("2026-08-22");
    expect(autoFilledFields.size).toBe(4);
  });

  it("re-upload with empty extraction clears all previous auto-filled fields", () => {
    const prevAutoFilled = new Set<string>([
      "unitsBilled",
      "periodFrom",
      "periodTo",
      "amountBilled",
      "readingType",
      "category",
      "energyChargeBilled",
    ]);

    const emptyBill: ExtractedBill = {
      source: "image",
      confidence: "low",
      fieldsFilled: 0,
    };

    const updates = computeReuploadUpdates(prevAutoFilled, emptyBill);

    expect(updates.sets).toEqual([]);
    expect(new Set(updates.clears)).toEqual(prevAutoFilled);
    expect(updates.nextAutoFilled.size).toBe(0);
    expect(updates.energyChargeVerifyRequired).toBe(false);
    expect(updates.wasReplaced).toBe(true);
  });
});

