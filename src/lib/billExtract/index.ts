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
 * Extracts bill data from an environment-agnostic PDF buffer using high-accuracy text layer.
 * Works in both browser and Node.js.
 */
export async function extractFromPdfBuffer(
  buffer: Uint8Array
): Promise<{ empty: boolean; extracted?: ExtractedBill }> {
  return extractPdfTextLayer(buffer);
}

/**
 * Extracts bill data from an environment-agnostic canvas (HTMLCanvasElement or Node Canvas).
 * Pipeline: preprocessCanvas (upscale + Otsu) -> runOcr (Tesseract v7) -> parseBillOcr -> applyPlausibilityGating.
 * Works in both browser and Node.js.
 */
export async function extractFromCanvas(
  canvas: any,
  source: "pdf" | "image" = "image",
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedBill> {
  const preprocessedCanvas = preprocessCanvas(canvas);

  let ocrResult;
  try {
    ocrResult = await runOcr(preprocessedCanvas, onProgress);
  } catch {
    throw new Error("ocr_failed");
  }

  if (!ocrResult.text || ocrResult.text.trim().length === 0) {
    throw new Error("empty_text");
  }

  return parseBillOcr(ocrResult, source);
}

/**
 * High-level browser entry point for bill extraction:
 * 1. Validates magic bytes & file size (10MB limit, zero upload).
 * 2. If PDF: attempts text-layer positional extraction first (near-100% accuracy on MSEDCL digital PDFs).
 * 3. If text layer is empty (scanned PDF) or image: renders canvas and runs extractFromCanvas.
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
      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdfTextResult = await extractFromPdfBuffer(buffer);
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

  // Step 4: Extract from canvas
  onProgress?.({ percent: 95, stage: "parsing" });
  const source = validation.fileType === "pdf" ? "pdf" : "image";
  const extracted = await extractFromCanvas(canvas, source, onProgress);

  onProgress?.({ percent: 100, stage: "complete" });
  return extracted;
}
