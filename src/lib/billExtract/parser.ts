import type { OcrResult, OcrLine, ExtractedBill, ReadingType } from "./types";

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
function cleanText(text: string): string {
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
 * extracts fields using label-proximity anchors as primary and validates dates.
 */
export function parseBillOcr(ocr: OcrResult, source: "pdf" | "image" = "pdf"): ExtractedBill {
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

  let unitsBilled: number | undefined;
  let periodFrom: string | undefined;
  let periodTo: string | undefined;
  let amountBilled: number | undefined;
  let readingType: ReadingType = "actual"; // default actual per spec
  let category: string | undefined;

  // --- 1. Reading Type ---
  // Defaults to "actual"; set "estimated" ONLY on an explicit marker
  const estimatedRegex = /(अंदाजित|सरासरी|सरासरी\s*बिल|RNA|average|estimated|assessed)/i;
  if (estimatedRegex.test(normalizedRawText)) {
    // Confirm marker appears in reading/bill status context
    readingType = "estimated";
  }

  // --- 2. Category ---
  // If residential markers are present, pre-fill the supported category
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
        // First try the remainder of the same line after the label
        const parts = line.cleanText.split(labelRegex);
        if (parts.length > 1) {
          const remainder = parts.slice(1).join(" ");
          const val = valueExtractor(remainder);
          if (val !== null) return { value: val, lineIndex: i };
        }

        // Next try the line directly below (within 2 lines)
        for (let j = i + 1; j <= Math.min(i + 2, normalizedLines.length - 1); j++) {
          const nextLine = normalizedLines[j];
          const val = valueExtractor(nextLine.cleanText);
          if (val !== null) return { value: val, lineIndex: j };
        }
      }
    }
    return null;
  }

  // --- 3. Units Billed ---
  // Anchor labels: युनिट, एकूण वापर, Billed Units, Units, Consumption
  const unitsLabelRegex = /(युनिट|एकूण\s*वापर|वापर\s*युनिट|billed\s*units?|units?\s*billed|consumption|total\s*units?)/i;
  const unitsMatch = findValueNearLabel(unitsLabelRegex, (t) => {
    const num = extractNumber(t);
    return num !== null && num > 0 && num < 100000 ? num : null;
  });
  if (unitsMatch !== null && typeof unitsMatch.value === "number") {
    unitsBilled = unitsMatch.value;
  }

  // --- 4. Amount Billed ---
  // Anchor labels: देयक रक्कम, देय रक्कम, एकूण देयक, Bill Amount, Total Bill, Amount Payable
  const amountLabelRegex = /(देयक\s*रक्कम|देय\s*रक्कम|एकूण\s*देयक|bill\s*amount|total\s*bill|amount\s*payable|net\s*amount)/i;
  const amountMatch = findValueNearLabel(amountLabelRegex, (t) => {
    const num = extractNumber(t);
    return num !== null && num > 0 ? Math.round(num) : null;
  });
  if (amountMatch !== null && typeof amountMatch.value === "number") {
    amountBilled = amountMatch.value;
  }

  // --- 5. Billing Period (periodFrom / periodTo) ---
  // Specific label anchors:
  // From: मागील रिडिंग दिनांक, मागील दिनांक, Previous Reading Date, Period From, From
  // To: चालु रिडिंग दिनांक, चालु दिनांक, Current Reading Date, Period To, To
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

  // If period not found via separate labels, search for date pair in bill period line
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

  // Date sanity enforcement (Feedback item 4):
  // periodFrom < periodTo. If equal or inverted, reject both to avoid corrupting diagnosis.
  if (periodFrom && periodTo) {
    if (periodFrom >= periodTo) {
      periodFrom = undefined;
      periodTo = undefined;
    }
  }

  // Count extracted fields
  let fieldsFilled = 0;
  if (unitsBilled !== undefined) fieldsFilled++;
  if (periodFrom !== undefined) fieldsFilled++;
  if (periodTo !== undefined) fieldsFilled++;
  if (amountBilled !== undefined) fieldsFilled++;
  if (readingType !== undefined) fieldsFilled++;
  if (category !== undefined) fieldsFilled++;

  // Confidence calculation
  let confidence: "high" | "medium" | "low" = "low";
  const coreFieldsFound = [unitsBilled, periodFrom, periodTo, amountBilled].filter(
    (v) => v !== undefined
  ).length;

  if (coreFieldsFound === 4) {
    confidence = "high";
  } else if (coreFieldsFound >= 2) {
    confidence = "medium";
  }

  return {
    unitsBilled,
    periodFrom,
    periodTo,
    amountBilled,
    readingType,
    category,
    // energyChargeBilled, circle, and priorMonthlyAvgUnits are strictly omitted per D45
    confidence,
    fieldsFilled,
    source,
    rawText,
  };
}
