import { isMsedclBill, parseIndianDate } from "./parser";
import { applyPlausibilityGating } from "./plausibility";
import type { ExtractedBill, ReadingType } from "./types";

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export interface PdfTextLayerResult {
  empty: boolean;
  extracted?: ExtractedBill;
}

function parseNumber(s: string): number | null {
  const trimmed = String(s).trim();
  // Dates (e.g. 15-09-2026) must never be parsed as numeric amounts
  if (/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/.test(trimmed)) return null;
  const cleaned = trimmed.replace(/(?:Rs\.?|₹|[\s,])/gi, "");
  const m = cleaned.match(/^-?\d+(?:\.\d+)?$/);
  if (m) return parseFloat(m[0]);
  const fallback = cleaned.match(/-?\d+(?:\.\d+)?/);
  return fallback ? parseFloat(fallback[0]) : null;
}

/**
 * Extracts data from MSEDCL digital PDFs directly via pdfjs text layer coordinates.
 * MSEDCL digital PDFs have clean Latin text and digits, with legacy-font Devanagari.
 * Using item bounding box positions yields near-100% extraction accuracy on digital bills.
 */
export async function extractPdfTextLayer(file: File | Uint8Array): Promise<PdfTextLayerResult> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = file instanceof Uint8Array ? file : await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const allItems: PdfTextItem[] = [];
  let page1Width = 575;
  let page1Height = 822;

  for (let p = 1; p <= numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    if (p === 1) {
      page1Width = viewport.width;
      page1Height = viewport.height;
    }
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if ("str" in item && typeof item.str === "string" && item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          w: item.width,
          h: item.height,
          page: p,
        });
      }
    }
  }

  // Scanned PDF check: 0 text items across all pages
  if (allItems.length === 0) {
    return { empty: true };
  }

  const extracted = parsePdfTextItems(allItems, page1Width, page1Height, numPages);
  return { empty: false, extracted };
}

/**
 * Pure function to extract bill fields from positional PdfTextItems.
 * Exported for unit testing and deterministic offline evaluation.
 */
export function parsePdfTextItems(
  allItems: PdfTextItem[],
  page1Width: number,
  page1Height: number,
  numPages: number
): ExtractedBill {
  const joinedText = allItems.map((it) => it.str).join(" ");
  if (!isMsedclBill(joinedText)) {
    throw new Error("not_msedcl");
  }

  const p1Items = allItems.filter((i) => i.page === 1);

  // 1. Amount Billed: primary amount in top-right billing summary box
  // Relative coordinates: normX ~ 0.70 to 1.0, normY ~ 0.84 to 0.92
  let amountBilled: number | undefined;
  const topBoxCandidates = p1Items.filter((i) => {
    const normX = i.x / page1Width;
    const normY = i.y / page1Height;
    return normX >= 0.70 && normY >= 0.84 && normY <= 0.92;
  });
  topBoxCandidates.sort((a, b) => b.y - a.y);

  for (const item of topBoxCandidates) {
    const n = parseNumber(item.str);
    if (n !== null && n > 0 && n < 100000) {
      amountBilled = n;
      break;
    }
  }

  // Fallback: search for first "Rs. NNNN.NN" in the barcode/bottom payment slip
  if (amountBilled === undefined) {
    const slipCandidates = p1Items.filter((i) => {
      const normY = i.y / page1Height;
      return normY >= 0.10 && normY <= 0.16 && /Rs\.?\s*\d+/i.test(i.str);
    });
    for (const item of slipCandidates) {
      const n = parseNumber(item.str);
      if (n !== null && n > 0 && n < 100000) {
        amountBilled = n;
        break;
      }
    }
  }

  // 2. Reading Dates (periodFrom / periodTo):
  // Located in supply-details box (normX ~ 0.50 to 0.75, normY ~ 0.69 to 0.78)
  // Must avoid due dates (normY > 0.80) and barcode slip dates (normY < 0.20)
  let periodFrom: string | undefined;
  let periodTo: string | undefined;

  const dateCandidates = p1Items
    .filter((i) => {
      const normX = i.x / page1Width;
      const normY = i.y / page1Height;
      return normX >= 0.48 && normX <= 0.75 && normY >= 0.69 && normY <= 0.78;
    })
    .map((i) => parseIndianDate(i.str))
    .filter((d): d is string => d !== null);

  const uniqueDates = [...new Set(dateCandidates)].sort();
  if (uniqueDates.length >= 2) {
    periodFrom = uniqueDates[0];
    periodTo = uniqueDates[uniqueDates.length - 1];
  }

  // 3. Values-grid band: readings & units
  // Located at normY ~ 0.62 to 0.68
  let currentReading: number | undefined;
  let previousReading: number | undefined;
  let multiplier = 1.0;
  let unitsBilled: number | undefined;

  const gridItems = p1Items.filter((i) => {
    const normY = i.y / page1Height;
    return normY >= 0.62 && normY <= 0.68;
  });

  // Sort grid items by X coordinate
  gridItems.sort((a, b) => a.x - b.x);

  for (const item of gridItems) {
    const normX = item.x / page1Width;
    const num = parseNumber(item.str);
    if (num === null) continue;

    if (normX < 0.12 && num >= 10) {
      currentReading = num;
    } else if (normX >= 0.12 && normX < 0.24 && num >= 10) {
      previousReading = num;
    } else if (normX >= 0.24 && normX < 0.32) {
      multiplier = num || 1.0;
    } else if (normX >= 0.32 && normX < 0.48 && num > 0) {
      if (unitsBilled === undefined) {
        unitsBilled = num;
      }
    } else if (normX >= 0.55 && normX < 0.72 && num > 0) {
      // Total consumption column
      unitsBilled = num;
    }
  }

  // 4. Category
  let category: string | undefined;
  if (/LT[-\s]*I.*Res|Res.*LT[-\s]*I/i.test(joinedText)) {
    category = "LT-I-B-residential";
  }

  // 5. Reading type (defaults to actual; estimated only on explicit marker)
  let readingType: ReadingType = "actual";
  if (/(अंदाजित|सरासरी|average|estimated|RNA)/i.test(joinedText)) {
    readingType = "estimated";
  }

  // 6. Page 2: Energy Charge Billed (from detailed charges breakdown)
  let energyChargeBilled: number | undefined;
  if (numPages >= 2) {
    const p2Items = allItems.filter((i) => i.page === 2);
    // On page 2, Energy Charge row is at normY ~ 0.90 to 0.95 (y ~ 750 to 775)
    // The amount sits in the rightmost column (normX >= 0.80)
    const ecCandidates = p2Items.filter((i) => {
      const normY = i.y / page1Height;
      const normX = i.x / page1Width;
      return normY >= 0.90 && normY <= 0.95 && normX >= 0.80;
    });

    for (const item of ecCandidates) {
      const n = parseNumber(item.str);
      if (n !== null && n > 0 && (amountBilled === undefined || n <= amountBilled)) {
        energyChargeBilled = n;
        break;
      }
    }
  }

  return applyPlausibilityGating({
    unitsBilled,
    currentReading,
    previousReading,
    multiplier,
    periodFrom,
    periodTo,
    amountBilled,
    energyChargeBilled,
    readingType,
    category,
    source: "pdf",
    rawText: joinedText,
  });
}
