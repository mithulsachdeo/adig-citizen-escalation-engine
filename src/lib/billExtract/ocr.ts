import type { OcrResult, OcrLine, OcrWord, ExtractionProgress } from "./types";

export type OcrProgressCallback = (progress: ExtractionProgress) => void;

/**
 * Execute client-side OCR on a rendered canvas using Tesseract.js (languages: Marathi + English).
 * Worker is loaded dynamically so it is not included in the landing or initial check bundles.
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
    const ret = await worker.recognize(canvas);
    const text = ret.data.text || "";

    // Tesseract.js data has blocks -> paragraphs -> lines, and sometimes a convenience top-level lines array
    const rawLines: Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      words?: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
    }> = [];

    const anyData = ret.data as unknown as {
      lines?: typeof rawLines;
      blocks?: Array<{
        paragraphs: Array<{
          lines: typeof rawLines;
        }>;
      }>;
    };

    if (Array.isArray(anyData.lines)) {
      rawLines.push(...anyData.lines);
    } else if (Array.isArray(anyData.blocks)) {
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

    const lines: OcrLine[] = rawLines.map((line) => {
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
