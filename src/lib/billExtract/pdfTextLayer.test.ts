import { describe, it, expect } from "vitest";
import { parsePdfTextItems, type PdfTextItem } from "./pdfTextLayer";

describe("PDF Text Layer Positional Extraction", () => {
  const PAGE_W = 575;
  const PAGE_H = 822;

  it("throws not_msedcl when bill text lacks MSEDCL / Mahavitaran markers", () => {
    const items: PdfTextItem[] = [
      { str: "Random Electricity Board", x: 100, y: 700, w: 200, h: 20, page: 1 },
      { str: "Bill Amount Rs 500", x: 100, y: 650, w: 100, h: 20, page: 1 },
    ];
    expect(() => parsePdfTextItems(items, PAGE_W, PAGE_H, 1)).toThrow("not_msedcl");
  });

  it("extracts amount, units, readings, dates, category, and page 2 energy charge accurately", () => {
    // Coordinate layout matching real MSEDCL digital PDF (172000314311.pdf)
    const items: PdfTextItem[] = [
      // Header marker
      { str: "MAHAVITARAN - MSEDCL", x: 50, y: 800, w: 200, h: 20, page: 1 },
      { str: "LT I Residential (B)", x: 50, y: 770, w: 150, h: 15, page: 1 },

      // Summary box (top right: normX ~ 0.85, normY ~ 0.88 -> y ~ 725)
      // Main bill amount
      { str: "2150.00", x: 485, y: 725, w: 60, h: 14, page: 1 },
      // Due date amount (should NOT be picked as primary amount)
      { str: "2170.00", x: 485, y: 689, w: 60, h: 14, page: 1 },

      // Due date in top box (should NOT be picked as billing period date)
      { str: "15-09-2026", x: 485, y: 704, w: 60, h: 14, page: 1 },

      // Supply details box: reading dates (normX ~ 0.55-0.70, normY ~ 0.70-0.75 -> x ~ 340, y ~ 585-610)
      { str: "22-07-2026", x: 340, y: 608, w: 60, h: 12, page: 1 },
      { str: "22-08-2026", x: 340, y: 588, w: 60, h: 12, page: 1 },

      // Values grid row (normY ~ 0.65 -> y ~ 536)
      // current reading (x ~ 50, normX ~ 0.08)
      { str: "21375", x: 50, y: 536, w: 40, h: 12, page: 1 },
      // previous reading (x ~ 100, normX ~ 0.17)
      { str: "21208", x: 100, y: 536, w: 40, h: 12, page: 1 },
      // multiplier (x ~ 160, normX ~ 0.28)
      { str: "1.00", x: 160, y: 536, w: 30, h: 12, page: 1 },
      // units billed (x ~ 210, normX ~ 0.36)
      { str: "167", x: 210, y: 536, w: 30, h: 12, page: 1 },

      // Page 2: Detailed charges breakdown
      // Energy charge row (normY ~ 0.93 -> y ~ 763, normX ~ 0.85 -> x ~ 490)
      { str: "Energy Charges", x: 100, y: 763, w: 100, h: 12, page: 2 },
      { str: "1099.08", x: 490, y: 763, w: 50, h: 12, page: 2 },
    ];

    const extracted = parsePdfTextItems(items, PAGE_W, PAGE_H, 2);

    expect(extracted.amountBilled).toBe(2150.0);
    expect(extracted.unitsBilled).toBe(167);
    expect(extracted.currentReading).toBe(21375);
    expect(extracted.previousReading).toBe(21208);
    expect(extracted.periodFrom).toBe("2026-07-22");
    expect(extracted.periodTo).toBe("2026-08-22");
    expect(extracted.category).toBe("LT-I-B-residential");
    expect(extracted.readingType).toBe("actual");
    expect(extracted.energyChargeBilled).toBe(1099.08);
    expect(extracted.energyChargeVerifyRequired).toBe(true);
    expect(extracted.source).toBe("pdf");
    expect(extracted.confidence).toBe("high");
  });
});
