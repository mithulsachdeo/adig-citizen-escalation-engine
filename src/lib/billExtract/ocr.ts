import type { OcrResult, OcrLine, OcrWord, ExtractionProgress } from "./types";

export type OcrProgressCallback = (progress: ExtractionProgress) => void;

/**
 * Preprocesses a canvas before OCR to dramatically improve OCR accuracy on mobile photos and low-res scans:
 * 1. Upscales so the long edge is >= ~2000px (tesseract mar+eng performs best with character height >= 30px).
 * 2. Converts to grayscale using standard luminance weights (0.299 R + 0.587 G + 0.114 B).
 * 3. Binarizes using Otsu's global thresholding algorithm to maximize foreground/background contrast.
 */
export function preprocessCanvas(srcCanvas: HTMLCanvasElement): HTMLCanvasElement {
  if (typeof document === "undefined") return srcCanvas;

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;
  if (!srcW || !srcH) return srcCanvas;

  const longEdge = Math.max(srcW, srcH);
  const targetLongEdge = 2200;
  const scale = longEdge < targetLongEdge ? targetLongEdge / longEdge : 1.0;

  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return srcCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);

  try {
    const imgData = ctx.getImageData(0, 0, dstW, dstH);
    const data = imgData.data;
    const numPixels = dstW * dstH;

    // 1. Grayscale + Histogram
    const histogram = new Int32Array(256);
    const grays = new Uint8Array(numPixels);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grays[p] = g;
      histogram[g]++;
    }

    // 2. Otsu threshold
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      const wF = numPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    // 3. Apply binary threshold
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const val = grays[p] > threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  } catch {
    return canvas;
  }
}

/**
 * Crops a rectangular bounding box from a canvas.
 */
export function cropCanvas(
  srcCanvas: HTMLCanvasElement,
  bbox: { x0: number; y0: number; x1: number; y1: number }
): HTMLCanvasElement {
  if (typeof document === "undefined") return srcCanvas;
  const w = Math.max(1, Math.round(bbox.x1 - bbox.x0));
  const h = Math.max(1, Math.round(bbox.y1 - bbox.y0));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(srcCanvas, bbox.x0, bbox.y0, w, h, 0, 0, w, h);
  }
  return canvas;
}

/**
 * Maps raw Tesseract result data into normalized OcrLine[] array.
 * In Tesseract.js v7, `data.lines` no longer exists on Page; instead `data.blocks`
 * is returned when `{ blocks: true }` is passed to `worker.recognize()`.
 * This function preserves compatibility across Tesseract versions by flattening
 * blocks -> paragraphs -> lines or using top-level lines if present.
 */
export function tesseractDataToOcrLines(data: unknown): OcrLine[] {
  const rawLines: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    words?: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
  }> = [];

  const anyData = data as {
    lines?: typeof rawLines;
    blocks?: Array<{
      paragraphs: Array<{
        lines: typeof rawLines;
      }>;
    }>;
  };

  if (Array.isArray(anyData?.lines)) {
    rawLines.push(...anyData.lines);
  } else if (Array.isArray(anyData?.blocks)) {
    for (const block of anyData.blocks) {
      if (Array.isArray(block.paragraphs)) {
        for (const para of block.paragraphs) {
          if (Array.isArray(para.lines)) {
            rawLines.push(...para.lines);
          }
        }
      }
    }
  }

  return rawLines.map((line) => {
    const words: OcrWord[] = (line.words || []).map((w) => ({
      text: w.text.trim(),
      confidence: w.confidence,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1,
      },
    }));

    return {
      text: line.text.trim(),
      bbox: {
        x0: line.bbox.x0,
        y0: line.bbox.y0,
        x1: line.bbox.x1,
        y1: line.bbox.y1,
      },
      words,
    };
  });
}

/**
 * Execute client-side OCR on a rendered canvas using Tesseract.js (languages: Marathi + English).
 * Note: `{ blocks: true }` MUST be passed in recognize options for Tesseract.js v7 to populate `data.blocks`.
 */
export async function runOcr(
  canvas: HTMLCanvasElement,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker(["mar", "eng"], undefined, {
    logger: (m) => {
      if (!onProgress) return;
      if (m.status === "loading language traineddata" || m.status === "loading tesseract core") {
        onProgress({
          percent: Math.round((m.progress || 0) * 50),
          stage: "downloading_ocr",
          messageKey: "upload.downloadingOcr",
        });
      } else if (m.status === "recognizing text") {
        onProgress({
          percent: 50 + Math.round((m.progress || 0) * 50),
          stage: "recognizing",
          messageKey: "upload.recognizing",
        });
      }
    },
  });

  try {
    // Crucial bug fix for Tesseract.js v7: pass { blocks: true } as 3rd parameter
    const ret = await worker.recognize(canvas, {}, { blocks: true });
    const text = ret.data.text || "";
    const lines = tesseractDataToOcrLines(ret.data);

    return {
      text,
      lines,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    await worker.terminate();
  }
}
