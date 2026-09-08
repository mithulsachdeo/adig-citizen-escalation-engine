// Types for client-side bill extraction and intake auto-fill (D45).
// Zero-PII contract: all data processed locally in browser, nothing leaves device.

export type ReadingType = "actual" | "estimated";

export interface ExtractedBill {
  unitsBilled?: number;
  periodFrom?: string; // ISO YYYY-MM-DD
  periodTo?: string;   // ISO YYYY-MM-DD
  amountBilled?: number;
  readingType?: ReadingType;
  category?: string;
  energyChargeBilled?: number;
  energyChargeVerifyRequired?: boolean;
  currentReading?: number;
  previousReading?: number;
  confidence: "high" | "medium" | "low";
  fieldsFilled: number;
  source: "pdf" | "image";
  rawText?: string;
}

export type ExtractionErrorCode =
  | "file_too_large"
  | "unsupported_type"
  | "not_msedcl"
  | "ocr_failed"
  | "empty_text"
  | "render_failed";

export interface ExtractionProgress {
  percent: number;
  stage: "validating" | "rendering" | "downloading_ocr" | "recognizing" | "parsing" | "complete";
  messageKey?: string;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OcrLine {
  text: string;
  bbox: BoundingBox;
  words: OcrWord[];
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  width: number;
  height: number;
}
