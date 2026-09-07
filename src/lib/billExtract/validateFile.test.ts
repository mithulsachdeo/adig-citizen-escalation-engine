import { describe, it, expect } from "vitest";
import { validateFile, MAX_FILE_SIZE_BYTES } from "./validateFile";

function createMockFile(bytes: number[], name = "test.dat", size?: number): File {
  const uint8 = new Uint8Array(size ?? bytes.length);
  uint8.set(bytes);
  return new File([uint8], name);
}

describe("validateFile", () => {
  it("detects valid PDF by %PDF- magic bytes regardless of name", async () => {
    const file = createMockFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34], "bill.dat");
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe("pdf");
  });

  it("detects valid PNG magic bytes", async () => {
    const file = createMockFile(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00],
      "photo.png"
    );
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe("png");
  });

  it("detects valid JPEG magic bytes", async () => {
    const file = createMockFile([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "photo.jpg");
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe("jpeg");
  });

  it("detects HEIC magic bytes with ftyp brand", async () => {
    // 4 empty bytes, then 'ftyp', then 'heic'
    const bytes = [
      0x00, 0x00, 0x00, 0x18, // box size
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x68, 0x65, 0x69, 0x63, // 'heic'
      0x00, 0x00, 0x00, 0x00,
    ];
    const file = createMockFile(bytes, "photo.heic");
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe("heic");
  });

  it("rejects files exceeding 10MB limit", async () => {
    const file = createMockFile([0x25, 0x50, 0x44, 0x46, 0x2d], "big.pdf", MAX_FILE_SIZE_BYTES + 1);
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("file_too_large");
  });

  it("rejects files with spoofed extension but invalid magic bytes", async () => {
    const file = createMockFile([0x00, 0x11, 0x22, 0x33, 0x44], "fake.pdf");
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("unsupported_type");
  });

  it("rejects tiny empty files (< 4 bytes)", async () => {
    const file = createMockFile([0x01, 0x02], "tiny.bin");
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("unsupported_type");
  });
});
