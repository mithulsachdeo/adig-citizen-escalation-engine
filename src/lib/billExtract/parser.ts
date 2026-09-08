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
  return normalizeDevanagariNumerals(text)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
 * Extract clean numeric value from text, stripping currency symbols, commas, dates, and pincodes.
 */
function extractNumber(text: string): number | null {
  // Strip dates first so date components (e.g. day '26' from '26-08-2024') are never extracted as numbers
  const withoutDates = text.replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, " ");
  // Strip 6-digit pin codes (Maharashtra pin codes 4xxxxx)
  const withoutPincodes = withoutDates.replace(/\b[1-9]\d{5}\b/g, " ");
  const cleaned = cleanText(withoutPincodes)
    .replace(/(?:₹|Rs\.?|INR|Re\.?)/gi, "")
    .replace(/,/g, "")
    .trim();
  const match = cleaned.match(/\b\d+(?:\.\d+)?\b/);
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
  const residentialRegex = /(?:LT[-\s]*I\b|LT[-\s]*1\b|residential|\bRes\b|घरगुती|निवासी)/i;
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
  // Prefer primary bill amount (देयक रक्कम / the amount tied to the bill date),
  // not early prompt payment (तत्पर देयक / तारखे पर्यंत भरल्यास / सूट)
  // or late payment (नंतरची रक्कम / मुदतीनंतर).
  const isPrompt = /(?:तत्पर|सूट|सवलत|तारखे\s*पर्यंत\s*भरल्यास|if\s*paid\s*by)/i;
  const isLate = /(?:नंतरची|मुदतीनंतर|(?:या\s*)?तारखे\s*नंतर)/i;
  const primaryAmountRegex = /(?:देयक\s*रक्?क?म|देय\s*रक्?क?म|रक्?क?म\s*रु|एकूण\s*देयक|bill\s*amount|total\s*bill|amount\s*payable|net\s*amount)/i;

  // Pass 1: Look for due-date / payment stub amount e.g. "अंतिम तारीख ... Rs. 1670.00"
  for (const line of normalizedLines) {
    if (isPrompt.test(line.cleanText)) continue;
    // Take portion before "या तारखे नंतर" / "मुदतीनंतर"
    const beforeLate = line.cleanText.split(isLate)[0];
    if (/(?:अंतिम|देय)\s*(?:तारीख|दिनांक)/i.test(beforeLate)) {
      const m = beforeLate.match(/(?:Rs\.?|Re\.?|₹|रु\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ""));
        if (val > 0 && val < 100000) {
          amountBilled = Math.round(val * 100) / 100;
          break;
        }
      }
    }
  }

  // Pass 2: Search for primary label that is NOT a prompt/late payment line
  if (amountBilled === undefined) {
    for (let i = 0; i < normalizedLines.length; i++) {
      const line = normalizedLines[i];
      if (primaryAmountRegex.test(line.cleanText) && !isPrompt.test(line.cleanText) && !isLate.test(line.cleanText)) {
        const parts = line.cleanText.split(primaryAmountRegex);
        if (parts.length > 1) {
          const remainder = parts.slice(1).join(" ");
          const num = extractNumber(remainder);
          if (num !== null && num > 0 && num < 100000) {
            amountBilled = Math.round(num * 100) / 100;
            break;
          }
        }

        for (let j = i + 1; j <= Math.min(i + 2, normalizedLines.length - 1); j++) {
          const nextLine = normalizedLines[j];
          if (!isPrompt.test(nextLine.cleanText) && !isLate.test(nextLine.cleanText)) {
            const num = extractNumber(nextLine.cleanText);
            if (num !== null && num > 0 && num < 100000) {
              amountBilled = Math.round(num * 100) / 100;
              break;
            }
          }
        }
        if (amountBilled !== undefined) break;
      }
    }
  }

  // Pass 3: Fallback search for "Rs./Re. NNNN.NN" on lines that are NOT prompt or late payment lines
  if (amountBilled === undefined) {
    for (const line of normalizedLines) {
      if (isPrompt.test(line.cleanText) || isLate.test(line.cleanText)) continue;
      const m = line.cleanText.match(/(?:Rs\.?|Re\.?|₹)\s*([\d,]+(?:\.\d{2})?)/i);
      if (m) {
        const n = extractNumber(m[1]);
        if (n !== null && n > 0 && n < 100000) {
          amountBilled = n;
          break;
        }
      }
    }
  }

  // Pass 4: Header amount e.g. "3830.00" near consumer address in top 15 lines
  if (amountBilled === undefined) {
    for (let i = 0; i < Math.min(15, normalizedLines.length); i++) {
      const line = normalizedLines[i];
      if (isPrompt.test(line.cleanText) || isLate.test(line.cleanText)) continue;
      const candidateText = line.cleanText
        .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, " ")
        .replace(/\b[1-9]\d{5}\b/g, " ");
      const m = candidateText.match(/\b(\d{2,5}\.\d{2})\b/);
      if (m) {
        const val = parseFloat(m[1]);
        if (val >= 50 && val < 100000) {
          amountBilled = val;
          break;
        }
      }
    }
  }

  // Pass 5: Last resort - any amount label if earlier passes didn't find anything
  if (amountBilled === undefined) {
    const amountMatch = findValueNearLabel(primaryAmountRegex, (t) => {
      const num = extractNumber(t);
      return num !== null && num > 0 ? Math.round(num * 100) / 100 : null;
    });
    if (amountMatch !== null && typeof amountMatch.value === "number") {
      amountBilled = amountMatch.value;
    }
  }

  // --- 5. Billing Period (periodFrom / periodTo) ---
  const fromLabelRegex = /(?:मागील\s*(?:रि|री)डिंग\s*दिनां?क?|मागील\s*दिनां?क?|मागील\s*\[?ग\s*दि[-.]?|prev(?:ious)?\s*(?:reading)?\s*date|period\s*from|from\s*date)/i;
  const toLabelRegex = /(?:चालु\s*(?:रि|री)डिंग\s*दिनां?क?|चालु\s*दिनां?क?|current\s*(?:reading)?\s*date|period\s*to|to\s*date)/i;

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
