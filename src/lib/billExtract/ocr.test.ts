import { describe, it, expect } from "vitest";
import { tesseractDataToOcrLines } from "./ocr";

describe("OCR Regression & Tesseract v7 blocks parsing", () => {
  it("extracts lines from v7 blocks -> paragraphs -> lines structure when blocks: true", () => {
    // In Tesseract v7, data.lines is omitted; data.blocks contains paragraphs with lines
    const v7Data = {
      text: "MSEDCL Bill\nUnits 167",
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: "MSEDCL Bill",
                  bbox: { x0: 10, y0: 20, x1: 200, y1: 40 },
                  words: [
                    { text: "MSEDCL", confidence: 95, bbox: { x0: 10, y0: 20, x1: 100, y1: 40 } },
                    { text: "Bill", confidence: 92, bbox: { x0: 110, y0: 20, x1: 200, y1: 40 } },
                  ],
                },
              ],
            },
          ],
        },
        {
          paragraphs: [
            {
              lines: [
                {
                  text: "Units 167",
                  bbox: { x0: 10, y0: 50, x1: 150, y1: 70 },
                  words: [
                    { text: "Units", confidence: 90, bbox: { x0: 10, y0: 50, x1: 80, y1: 70 } },
                    { text: "167", confidence: 94, bbox: { x0: 90, y0: 50, x1: 150, y1: 70 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const lines = tesseractDataToOcrLines(v7Data);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("MSEDCL Bill");
    expect(lines[0].bbox).toEqual({ x0: 10, y0: 20, x1: 200, y1: 40 });
    expect(lines[0].words).toHaveLength(2);
    expect(lines[1].text).toBe("Units 167");
    expect(lines[1].words[1].text).toBe("167");
  });

  it("handles legacy v5/v6 data.lines format if present", () => {
    const legacyData = {
      lines: [
        {
          text: "Total Amount Rs 2150.00",
          bbox: { x0: 50, y0: 100, x1: 300, y1: 120 },
          words: [],
        },
      ],
    };

    const lines = tesseractDataToOcrLines(legacyData);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Total Amount Rs 2150.00");
  });

  it("returns empty array if data has no blocks and no lines (e.g. recognize without blocks: true)", () => {
    const emptyData = {
      text: "Some text",
      // blocks missing or null
    };

    const lines = tesseractDataToOcrLines(emptyData);
    expect(lines).toEqual([]);
  });
});
