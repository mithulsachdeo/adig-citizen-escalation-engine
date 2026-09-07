import { validateFile } from "./validateFile";
import { decodeToCanvas } from "./decodeToCanvas";
import { runOcr } from "./ocr";
import { parseBillOcr } from "./parser";
import type { ExtractedBill, ExtractionProgress } from "./types";

export type {
  ExtractedBill,
  ExtractionProgress,
  ExtractionErrorCode,
  ReadingType,
  OcrResult,
  OcrLine,
  OcrWord,
  BoundingBox,
} from "./types";

/**
 * High-level entry point for bill extraction:
 * 1. Validates magic bytes & file size (10MB limit, zero upload).
 * 2. Decodes first page of PDF / HEIC / Image into an HTML Canvas.
 * 3. Runs Tesseract.js (mar + eng) client-side with progress reporting.
 * 4. Parses OCR tokens for MSEDCL fields with date sanity and omission rules (D45).
 */
export async function extractBill(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedBill> {
  // Step 1: Validate file magic bytes & size
  onProgress?.({ percent: 5, stage: "validating" });
  const validation = await validateFile(file);
  if (!validation.valid || !validation.fileType) {
    throw new Error(validation.error || "unsupported_type");
  }

  // Step 2: Render to canvas
  onProgress?.({ percent: 15, stage: "rendering" });
  let canvas: HTMLCanvasElement;
  try {
    canvas = await decodeToCanvas(file, validation.fileType);
  } catch {
    throw new Error("render_failed");
  }

  // Step 3: Run OCR
  let ocrResult;
  try {
    ocrResult = await runOcr(canvas, onProgress);
  } catch {
    throw new Error("ocr_failed");
  }

  if (!ocrResult.text || ocrResult.text.trim().length === 0) {
    throw new Error("empty_text");
  }

  // Step 4: Parse & extract fields
  onProgress?.({ percent: 95, stage: "parsing" });
  const source = validation.fileType === "pdf" ? "pdf" : "image";
  const extracted = parseBillOcr(ocrResult, source);

  onProgress?.({ percent: 100, stage: "complete" });
  return extracted;
}
