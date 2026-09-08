import type { ExtractionErrorCode } from "./types";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type DetectedFileType = "pdf" | "png" | "jpeg" | "heic" | "webp";

export interface ValidationResult {
  valid: boolean;
  fileType?: DetectedFileType;
  error?: ExtractionErrorCode;
}

/**
 * Detect file type using magic bytes (first 16 bytes) rather than trusting the file extension.
 * Rejects files > 10MB or unsupported formats.
 */
export async function validateFile(file: File): Promise<ValidationResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "file_too_large" };
  }

  if (file.size < 4) {
    return { valid: false, error: "unsupported_type" };
  }

  const slice = file.slice(0, 16);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { valid: true, fileType: "pdf" };
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, fileType: "png" };
  }

  // JPEG: 0xFF, 0xD8, 0xFF (includes standard JFIF / Exif)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, fileType: "jpeg" };
  }

  // WebP: RIFF....WEBP (bytes 0-3: 0x52, 0x49, 0x46, 0x46; bytes 8-11: 0x57, 0x45, 0x42, 0x50)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, fileType: "webp" };
  }

  // HEIC / HEIF: bytes 4-7 are 'ftyp' (0x66, 0x74, 0x79, 0x70)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    const heicBrands = ["heic", "heix", "hevc", "mif1", "msf1", "mp42", "isom"];
    if (heicBrands.includes(brand)) {
      return { valid: true, fileType: "heic" };
    }
  }

  return { valid: false, error: "unsupported_type" };
}
