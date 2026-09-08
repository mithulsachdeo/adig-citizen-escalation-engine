import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { IntakeStep } from "./IntakeStep";
import { EMPTY_FORM } from "./state";
import { LanguageProvider } from "@/i18n/context";

describe("IntakeStep layout order & path divider", () => {
  it("renders BillUploader -> divider -> BillGuide -> fieldset in strict DOM order (EN)", () => {
    const html = renderToString(
      <LanguageProvider initialLang="en">
        <IntakeStep
          form={EMPTY_FORM}
          setField={() => {}}
          errors={{}}
          onSubmit={() => {}}
        />
      </LanguageProvider>
    );

    // Divider label renders from intake.orEnterManually
    expect(html).toContain("Or enter your bill details manually");

    // Decorative line spans have aria-hidden="true"
    expect(html).toContain('aria-hidden="true" style="flex:1;height:1px;background:var(--line)"');

    // DOM order assertions:
    // 1. BillUploader trigger/dropzone
    const uploaderIdx = html.indexOf('type="file"');
    // 2. Divider with intake.orEnterManually
    const dividerIdx = html.indexOf("Or enter your bill details manually");
    // 3. BillGuide toggle
    const billGuideIdx = html.indexOf("adig-billguide");
    // 4. Form fieldset
    const fieldsetIdx = html.indexOf("<fieldset");

    expect(uploaderIdx).toBeGreaterThan(-1);
    expect(dividerIdx).toBeGreaterThan(-1);
    expect(billGuideIdx).toBeGreaterThan(-1);
    expect(fieldsetIdx).toBeGreaterThan(-1);

    // BillUploader appears before divider
    expect(uploaderIdx).toBeLessThan(dividerIdx);
    // Divider appears before BillGuide
    expect(dividerIdx).toBeLessThan(billGuideIdx);
    // BillGuide appears before form fieldset
    expect(billGuideIdx).toBeLessThan(fieldsetIdx);
  });

  it("renders divider label in Marathi when language is mr", () => {
    const html = renderToString(
      <LanguageProvider initialLang="mr">
        <IntakeStep
          form={EMPTY_FORM}
          setField={() => {}}
          errors={{}}
          onSubmit={() => {}}
        />
      </LanguageProvider>
    );

    expect(html).toContain("किंवा तुमचे बिलाचे तपशील स्वतः भरा");
  });
});
