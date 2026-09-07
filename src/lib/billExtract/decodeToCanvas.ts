import type { DetectedFileType } from "./validateFile";

/**
 * Decode a PDF (first page), HEIC, PNG, or JPEG file to an HTMLCanvasElement for OCR.
 * Libraries are loaded dynamically so they never impact the main or landing bundles.
 */
export async function decodeToCanvas(
  file: File,
  fileType: DetectedFileType
): Promise<HTMLCanvasElement> {
  if (fileType === "pdf") {
    return await pdfToCanvas(file);
  }

  if (fileType === "heic") {
    return await heicToCanvas(file);
  }

  return await imageToCanvas(file);
}

async function pdfToCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // Render at 2.0x scale (roughly 150-200 DPI for A4) for optimal OCR quality
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d canvas context for PDF");

  // @ts-expect-error pdfjs-dist CanvasContext type compatibility
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function heicToCanvas(file: File): Promise<HTMLCanvasElement> {
  const heic2anyModule = await import("heic2any");
  const heic2any = heic2anyModule.default || heic2anyModule;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  return await imageToCanvas(blob);
}

async function imageToCanvas(blobOrFile: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blobOrFile);
  try {
    return await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2d canvas context for image"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("Failed to load image into canvas"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
