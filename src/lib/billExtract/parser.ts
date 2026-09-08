import type { OcrResult, ExtractedBill, ReadingType } from "./types";
import { applyPlausibilityGating } from "./plausibility";

/**
 * Normalizes Devanagari numerals (०–९) to standard Arabic numerals (0–9).
 */
export function normalizeDevanagariNumerals(text: string): string {
  return text.replace(/[०-९]/g, (ch) => {
    return String(ch.charCodeAt(0) - 0x0966);
  });
}

/**
 * Normalizes text: trims, unifies Devanagari numerals, and cleans double spaces.
 */
export function cleanText(text: string): string {
  return normalizeDevanagariNumerals(text).replace(/\s+/g, " ").trim();
}

/**
 * Verifies that the OCR text contains the MSEDCL issuer fingerprint.
 * Requires mahadiscom.in OR महावितरण (or MSEDCL / MAHADISCOM).
 */
export function isMsedclBill(rawText: string): boolean {
  const lower = rawText.toLowerCase();
  return (
    lower.includes("mahadiscom.in") ||
    lower.includes("mahadiscom") ||
    rawText.includes("महावितरण") ||
    lower.includes("msedcl") ||
    lower.includes("mahavitaran")
  );
}

/**
 * Parses an Indian date string (DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY) into ISO YYYY-MM-DD.
 * Returns null if invalid or date doesn't parse cleanly.
 */
export function parseIndianDate(dateStr: string): string | null {
  const cleaned = cleanText(dateStr);
  const match = cleaned.match(/\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})\b/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Extract clean numeric value from text, stripping currency symbols and commas.
 */
function extractNumber(text: string): number | null {
  const cleaned = cleanText(text)
    .replace(/(?:₹|Rs\.?|INR)/gi, "")
    .replace(/,/g, "")
    .trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return Number.isFinite(num) ? num : null;
}

/**
 * Main parser: takes OCR lines & raw text, enforces MSEDCL validation,
 * extracts fields using positional values-grid extraction, label proximity, and plausibility gating.
 */
export function parseBillOcr(ocr: OcrResult, source: "pdf" | "image" = "image"): ExtractedBill {
  const rawText = ocr.text || "";
  const normalizedRawText = cleanText(rawText);

  // Step 1: Validate issuer fingerprint
  if (!isMsedclBill(normalizedRawText)) {
    throw new Error("not_msedcl");
  }

  const lines = ocr.lines || [];
  const normalizedLines = lines.map((line) => ({
    ...line,
    cleanText: cleanText(line.text),
  }));

  let currentReading: number | undefined;
  let previousReading: number | undefined;
  let multiplier = 1.0;
  let unitsBilled: number | undefined;
  let periodFrom: string | undefined;
  let periodTo: string | undefined;
  let amountBilled: number | undefined;
  let readingType: ReadingType = "actual";
  let category: string | undefined;

  // --- 1. Reading Type ---
  const estimatedRegex = /(अंदाजित|सरासरी|सरासरी\s*बिल|RNA|average|estimated|assessed)/i;
  if (estimatedRegex.test(normalizedRawText)) {
    readingType = "estimated";
  }

  // --- 2. Category ---
  const residentialRegex = /(LT[-\s]*I|LT[-\s]*1|residential|घरगुती|निवासी)/i;
  if (residentialRegex.test(normalizedRawText)) {
    category = "LT-I-B-residential";
  }

  // Helper: search adjacent tokens on the same line or line immediately below
  function findValueNearLabel(
    labelRegex: RegExp,
    valueExtractor: (text: string) => string | number | null
  ): { value: string | number; lineIndex: number } | null {
    for (let i = 0; i < normalizedLines.length; i++) {
      const line = normalizedLines[i];
      if (labelRegex.test(line.cleanText)) {
        // Same line after label
        const parts = line.cleanText.split(labelRegex);
        if (parts.length > 1) {
          const remainder = parts.slice(1).join(" ");
          const val = valueExtractor(remainder);
          if (val !== null) return { value: val, lineIndex: i };
        }

        // Line directly below
        for (let j = i + 1; j <= Math.min(i + 2, normalizedLines.length - 1); j++) {
          const nextLine = normalizedLines[j];
          const val = valueExtractor(nextLine.cleanText);
          if (val !== null) return { value: val, lineIndex: j };
        }
      }
    }
    return null;
  }

  // --- 3. Positional Readings-Grid Extraction (Units, Current, Previous) ---
  // In MSEDCL layout, readings grid has columns:
  // [चालु रीडिंग] [मागील रीडिंग] [गुणक] [अवयव] [युनिट] [समा. युनिट] [एकूण वापर]
  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const isGridHeader = /(चालु|मागील|गुणक|अवयव|युनिट|वापर|reading|previous|multiplier)/i.test(line.cleanText);
    if (isGridHeader) {
      // Check next 2 lines for the row containing multiple numeric tokens
      for (let j = i + 1; j <= Math.min(i + 2, normalizedLines.length - 1); j++) {
        const cand = normalizedLines[j];
        const numMatches = cand.cleanText.match(/\b\d+(?:\.\d+)?\b/g);
        if (numMatches && numMatches.length >= 3) {
          const nums = numMatches.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n));
          if (nums.length >= 3 && nums[0] >= 10 && nums[1] >= 10 && nums[0] >= nums[1]) {
            currentReading = nums[0];
            previousReading = nums[1];
            if (nums[2] === 1.0 || nums[2] === 1) {
              multiplier = nums[2];
              if (nums[3] !== undefined) unitsBilled = nums[3];
            } else {
              unitsBilled = nums[2];
            }
            break;
          }
        }
      }
      if (unitsBilled !== undefined) break;
    }
  }

  // Fallback: Anchor label search for units
  if (unitsBilled === undefined) {
    const unitsLabelRegex = /(युनिट|एकूण\s*वापर|वापर\s*युनिट|billed\s*units?|units?\s*billed|consumption|total\s*units?)/i;
    const unitsMatch = findValueNearLabel(unitsLabelRegex, (t) => {
      const num = extractNumber(t);
      return num !== null && num > 0 && num < 100000 ? num : null;
    });
    if (unitsMatch !== null && typeof unitsMatch.value === "number") {
      unitsBilled = unitsMatch.value;
    }
  }

  // If readings were found but units was missing, compute units from readings
  if (unitsBilled === undefined && currentReading !== undefined && previousReading !== undefined && currentReading >= previousReading) {
    unitsBilled = Math.round((currentReading - previousReading) * multiplier);
  }

  // --- 4. Amount Billed ---
  // Look for primary amount patterns (e.g. देयक रक्कम, रक्कम रु, bill amount)
  const amountLabelRegex = /(देयक\s*रक्कम|देय\s*रक्कम|रक्कम\s*रु|एकूण\s*देयक|bill\s*amount|total\s*bill|amount\s*payable|net\s*amount)/i;
  const amountMatch = findValueNearLabel(amountLabelRegex, (t) => {
    const num = extractNumber(t);
    return num !== null && num > 0 ? Math.round(num * 100) / 100 : null;
  });
  if (amountMatch !== null && typeof amountMatch.value === "number") {
    amountBilled = amountMatch.value;
  }

  // Fallback: search for "Rs. NNNN.NN" in bill summary lines
  if (amountBilled === undefined) {
    for (const line of normalizedLines) {
      const m = line.cleanText.match(/Rs\.?\s*([\d,]+(?:\.\d{2})?)/i);
      if (m) {
        const n = extractNumber(m[1]);
        if (n !== null && n > 0 && n < 100000) {
          amountBilled = n;
          break;
        }
      }
    }
  }

  // --- 5. Billing Period (periodFrom / periodTo) ---
  const fromLabelRegex = /(मागील\s*रिडिंग\s*दिनांक|मागील\s*दिनांक|prev(?:ious)?\s*(?:reading)?\s*date|period\s*from|from\s*date)/i;
  const toLabelRegex = /(चालु\s*रिडिंग\s*दिनांक|चालु\s*दिनांक|current\s*(?:reading)?\s*date|period\s*to|to\s*date)/i;

  const fromMatch = findValueNearLabel(fromLabelRegex, (t) => parseIndianDate(t));
  const toMatch = findValueNearLabel(toLabelRegex, (t) => parseIndianDate(t));

  if (fromMatch && typeof fromMatch.value === "string") {
    periodFrom = fromMatch.value;
  }
  if (toMatch && typeof toMatch.value === "string") {
    periodTo = toMatch.value;
  }

  // Fallback: search for reading date pairs in supply details context
  if (!periodFrom || !periodTo) {
    const periodLineRegex = /(बिल\s*कालावधी|billing\s*period|bill\s*period|reading\s*dates?)/i;
    for (const line of normalizedLines) {
      if (periodLineRegex.test(line.cleanText)) {
        const dates = Array.from(
          line.cleanText.matchAll(/\b(\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4})\b/g)
        ).map((m) => parseIndianDate(m[1]));
        const validDates = dates.filter((d): d is string => Boolean(d));
        if (validDates.length >= 2) {
          if (!periodFrom) periodFrom = validDates[0];
          if (!periodTo) periodTo = validDates[1];
          break;
        }
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
    readingType,
    category,
    source,
    rawText,
  });
}
