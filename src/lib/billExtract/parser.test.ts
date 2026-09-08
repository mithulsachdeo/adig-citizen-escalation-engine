import { describe, it, expect } from "vitest";
import { parseBillOcr, normalizeDevanagariNumerals, parseIndianDate, isMsedclBill } from "./parser";
import type { OcrResult } from "./types";

function mockOcrResult(text: string, lines: string[] = []): OcrResult {
  const lineObjects = (lines.length > 0 ? lines : text.split("\n")).map((l) => ({
    text: l,
    bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
    words: l.split(/\s+/).map((w) => ({
      text: w,
      confidence: 90,
      bbox: { x0: 0, y0: 0, x1: 50, y1: 20 },
    })),
  }));

  return {
    text,
    lines: lineObjects,
    width: 1000,
    height: 1400,
  };
}

describe("normalizeDevanagariNumerals", () => {
  it("converts Devanagari digits ०-९ to 0-9", () => {
    expect(normalizeDevanagariNumerals("१२३४५६७८९०")).toBe("1234567890");
    expect(normalizeDevanagariNumerals("युनिट: ३५०")).toBe("युनिट: 350");
  });
});

describe("parseIndianDate", () => {
  it("parses DD-MM-YYYY into ISO YYYY-MM-DD", () => {
    expect(parseIndianDate("15-06-2024")).toBe("2024-06-15");
    expect(parseIndianDate("01/01/2025")).toBe("2025-01-01");
    expect(parseIndianDate("१५-०६-२०२४")).toBe("2024-06-15");
  });

  it("returns null for invalid dates", () => {
    expect(parseIndianDate("32-01-2024")).toBe(null);
    expect(parseIndianDate("15-13-2024")).toBe(null);
    expect(parseIndianDate("not a date")).toBe(null);
  });
});

describe("isMsedclBill", () => {
  it("detects MSEDCL keywords", () => {
    expect(isMsedclBill("Visit www.mahadiscom.in for online payments")).toBe(true);
    expect(isMsedclBill("महाराष्ट्र राज्य विद्युत वितरण कंपनी मर्यादित महावितरण")).toBe(true);
    expect(isMsedclBill("MSEDCL Electricity Bill")).toBe(true);
    expect(isMsedclBill("Torrent Power Bill")).toBe(false);
  });
});

describe("parseBillOcr", () => {
  it("throws not_msedcl error if issuer fingerprint is absent", () => {
    const ocr = mockOcrResult("Some random invoice\nTotal: 500");
    expect(() => parseBillOcr(ocr, "pdf")).toThrow("not_msedcl");
  });

  it("extracts all standard fields on happy path MSEDCL bill", () => {
    const sampleText = `
महाराष्ट्र राज्य विद्युत वितरण कंपनी मर्यादित (महावितरण)
www.mahadiscom.in
ग्राहकाचे नाव: TEST CITIZEN
मागील रिडिंग दिनांक: 01-05-2024
चालु रिडिंग दिनांक: 01-06-2024
एकूण वापर युनिट: 245
देयक रक्कम: ₹ 2,150.00
टॅरिफ: LT-I B Residential
    `;
    const lines = [
      "महाराष्ट्र राज्य विद्युत वितरण कंपनी मर्यादित (महावितरण)",
      "www.mahadiscom.in",
      "मागील रिडिंग दिनांक: 01-05-2024",
      "चालु रिडिंग दिनांक: 01-06-2024",
      "एकूण वापर युनिट: 245",
      "देयक रक्कम: ₹ 2,150.00",
      "टॅरिफ: LT-I B Residential",
    ];

    const result = parseBillOcr(mockOcrResult(sampleText, lines), "pdf");

    expect(result.unitsBilled).toBe(245);
    expect(result.periodFrom).toBe("2024-05-01");
    expect(result.periodTo).toBe("2024-06-01");
    expect(result.amountBilled).toBe(2150);
    expect(result.readingType).toBe("actual");
    expect(result.category).toBe("LT-I-B-residential");
    expect(result.confidence).toBe("high");
    expect(result.fieldsFilled).toBe(6);

    // Strict omission checks (D45 & User Feedback item 1 & 2):
    // energyChargeBilled must NEVER be pre-filled so calculate() cannot prematurely run
    expect((result as unknown as Record<string, unknown>).energyChargeBilled).toBeUndefined();
    // circle and priorMonthlyAvgUnits must NEVER be extracted
    expect((result as unknown as Record<string, unknown>).circle).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).priorMonthlyAvgUnits).toBeUndefined();
  });

  it("normalizes Devanagari numerals in units and amount", () => {
    const sampleText = `
महावितरण mahadiscom.in
बिल कालावधी: ०१-०५-२०२४ ते ०१-०६-२०२४
चालु रीडिंग मागील रीडिंग गुणक युनिट
२१३५० २१००० १.०० ३५०
देयक रक्कम: ₹ ४,२५०
निवासी LT-1
    `;
    const lines = [
      "महावितरण mahadiscom.in",
      "बिल कालावधी: ०१-०५-२०२४ ते ०१-०६-२०२४",
      "चालु रीडिंग मागील रीडिंग गुणक युनिट",
      "२१३५० २१००० १.०० ३५०",
      "देयक रक्कम: ₹ ४,२५०",
      "निवासी LT-1",
    ];

    const result = parseBillOcr(mockOcrResult(sampleText, lines), "image");
    expect(result.unitsBilled).toBe(350);
    expect(result.amountBilled).toBe(4250);
    expect(result.periodFrom).toBe("2024-05-01");
    expect(result.periodTo).toBe("2024-06-01");
    expect(result.source).toBe("image");
  });

  it("enforces date sanity: blanks both dates if periodFrom >= periodTo", () => {
    const invertedDates = `
महावितरण mahadiscom.in
मागील रिडिंग दिनांक: 15-06-2024
चालु रिडिंग दिनांक: 10-06-2024
युनिट: 120
    `;
    const lines = [
      "महावितरण mahadiscom.in",
      "मागील रिडिंग दिनांक: 15-06-2024",
      "चालु रिडिंग दिनांक: 10-06-2024",
      "युनिट: 120",
    ];

    const result = parseBillOcr(mockOcrResult(invertedDates, lines), "pdf");
    expect(result.unitsBilled).toBe(120);
    // Inverted dates must be discarded so wrong billing period does not corrupt diagnosis
    expect(result.periodFrom).toBeUndefined();
    expect(result.periodTo).toBeUndefined();
  });

  it("defaults readingType to 'actual', sets 'estimated' only on explicit marker", () => {
    const normalText = "महावितरण mahadiscom.in युनिट: 100";
    const normalResult = parseBillOcr(mockOcrResult(normalText), "pdf");
    expect(normalResult.readingType).toBe("actual");

    const estimatedText = "महावितरण mahadiscom.in सरासरी बिल युनिट: 100";
    const estimatedResult = parseBillOcr(mockOcrResult(estimatedText), "pdf");
    expect(estimatedResult.readingType).toBe("estimated");
  });
});
