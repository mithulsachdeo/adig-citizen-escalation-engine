import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ResultsStep } from "./ResultsStep";
import { LanguageProvider } from "@/i18n/context";
import { runVertical } from "@/engine/runVertical";
import { msedclElectricitySpec } from "@/engine/verticals/msedcl-electricity/spec";
import type { UserInput } from "@/engine/types";

function input(overrides: Partial<UserInput> = {}): UserInput {
  return {
    unitsBilled: 100,
    periodFrom: "2026-06-01",
    periodTo: "2026-06-30",
    amountBilled: 6000,
    energyChargeBilled: 5000,
    readingType: "actual",
    category: "LT-I-B-residential",
    recentMeterSwap: false,
    ...overrides,
  };
}

describe("ResultsStep overcharge display gating", () => {
  it("does not render 'Likely overcharge' or working toggle when bill is legitimate (not actionable)", () => {
    // Normal ~30-day period with energyChargeBilled > lawful, so calculation.overcharge > 0,
    // but diagnosis is legitimate (isActionable === false).
    const userInput = input();
    const result = runVertical(msedclElectricitySpec, userInput);

    // Assert fixture preconditions
    expect(result.diagnosis.isActionable).toBe(false);
    expect(result.diagnosis.classification).toBe("legitimate");
    expect(result.calculation).not.toBeNull();
    expect(result.calculation!.overcharge).toBeGreaterThan(0);

    const html = renderToString(
      <LanguageProvider>
        <ResultsStep
          result={result}
          amountBilled={userInput.amountBilled}
          onBack={() => {}}
          onNext={() => {}}
        />
      </LanguageProvider>
    );

    // Assert bug is absent: no "Likely overcharge" and no "see the working" toggle
    expect(html).not.toContain("Likely overcharge");
    expect(html).not.toContain("See the full slab-by-slab working");

    // Sanity: genuine diagnosis finding title and summary are still rendered
    expect(html).toContain("This bill looks genuine");
    expect(html).toContain(result.diagnosis.summary);
  });

  it("renders 'Likely overcharge' and working toggle when bill is actionable (slab-jump)", () => {
    // Slab-jump input: long period, actual reading, positive overcharge → isActionable === true
    const userInput = input({
      unitsBilled: 150,
      periodFrom: "2026-04-01",
      periodTo: "2026-09-30",
      amountBilled: 1500,
      energyChargeBilled: 936,
    });
    const result = runVertical(msedclElectricitySpec, userInput);

    // Assert fixture preconditions
    expect(result.diagnosis.isActionable).toBe(true);
    expect(result.calculation).not.toBeNull();
    expect(result.calculation!.overcharge).toBeGreaterThan(0);

    const html = renderToString(
      <LanguageProvider>
        <ResultsStep
          result={result}
          amountBilled={userInput.amountBilled}
          onBack={() => {}}
          onNext={() => {}}
        />
      </LanguageProvider>
    );

    // Overcharge figure and breakdown should be present for actionable bills
    expect(html).toContain("Likely overcharge");
    expect(html).toContain("See the full slab-by-slab working");
  });
});
