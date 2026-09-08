import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { BillUploader } from "./BillUploader";
import { LanguageProvider } from "@/i18n/context";

describe("BillUploader component", () => {
  it("renders idle state with CTA and format guidelines", () => {
    const html = renderToString(
      <LanguageProvider>
        <BillUploader onExtracted={() => {}} />
      </LanguageProvider>
    );

    expect(html).toContain("Scan your bill to auto-fill");
    expect(html).toContain("Upload bill (PDF or photo)");
    expect(html).toContain("PDF, JPG, PNG, HEIC, WebP up to 10MB");
    expect(html).toContain('type="file"');
  });

  it("renders in Marathi when language is set to mr", () => {
    const html = renderToString(
      <LanguageProvider initialLang="mr">
        <BillUploader onExtracted={() => {}} />
      </LanguageProvider>
    );

    expect(html).toContain("बिल स्कॅन करून माहिती भरा");
    expect(html).toContain("बिल अपलोड करा (PDF किंवा फोटो)");
  });
});
