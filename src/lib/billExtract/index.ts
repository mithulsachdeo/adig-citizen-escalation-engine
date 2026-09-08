import { validateFile } from "./validateFile";
import { decodeToCanvas } from "./decodeToCanvas";
import { runOcr, preprocessCanvas } from "./ocr";
import { parseBillOcr } from "./parser";
import { extractPdfTextLayer } from "./pdfTextLayer";
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
 * 2. If PDF: attempts text-layer positional extraction first (near-100% accuracy on MSEDCL digital PDFs).
 * 3. If text layer is empty (scanned PDF) or image: pre-processes canvas (grayscale, 2000px+, Otsu binarization),
 *    executes Tesseract v7 with blocks:true, and extracts positionally with plausibility gating.
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

  // Step 2: If PDF, try high-accuracy text layer first
  if (validation.fileType === "pdf") {
    onProgress?.({ percent: 20, stage: "rendering" });
    try {
      const pdfTextResult = await extractPdfTextLayer(file);
      if (!pdfTextResult.empty && pdfTextResult.extracted) {
        onProgress?.({ percent: 100, stage: "complete" });
        return pdfTextResult.extracted;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "not_msedcl") {
        throw err;
      }
      // Otherwise fall back to rasterize & OCR (scanned PDF)
    }
  }

  // Step 3: Render to canvas (for images or scanned PDFs)
  onProgress?.({ percent: 25, stage: "rendering" });
  let canvas: HTMLCanvasElement;
  try {
    canvas = await decodeToCanvas(file, validation.fileType);
  } catch {
    throw new Error("render_failed");
  }

  // Step 4: Preprocess canvas in-memory
  const preprocessedCanvas = preprocessCanvas(canvas);

  // Step 5: Run OCR
  let ocrResult;
  try {
    ocrResult = await runOcr(preprocessedCanvas, onProgress);
  } catch {
    throw new Error("ocr_failed");
  }

  if (!ocrResult.text || ocrResult.text.trim().length === 0) {
    throw new Error("empty_text");
  }

  // Step 6: Parse & extract fields with plausibility gating
  onProgress?.({ percent: 95, stage: "parsing" });
  const source = validation.fileType === "pdf" ? "pdf" : "image";
  const extracted = parseBillOcr(ocrResult, source);

  onProgress?.({ percent: 100, stage: "complete" });
  return extracted;
}
