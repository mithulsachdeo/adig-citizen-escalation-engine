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
    amountBilled: 1200,
    energyChargeBilled: 396,
    readingType: "actual",
    category: "LT-I-B-residential",
    recentMeterSwap: false,
    ...overrides,
  };
}

describe("ResultsStep calculation display & verification gating (D46)", () => {
  it("(a) legitimate + calculation → scope note + billed/lawful rows + working toggle + confirmation render", () => {
    // Normal ~30-day bill where energyChargeBilled matches lawful calculation
    const userInput = input();
    const result = runVertical(msedclElectricitySpec, userInput);

    // Preconditions
    expect(result.diagnosis.isActionable).toBe(false);
    expect(result.diagnosis.classification).toBe("legitimate");
    expect(result.calculation).not.toBeNull();
    expect(result.calculation!.energyChargeMismatch).toBe(false);

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

    // Scope note leads the block
    expect(html).toContain(
      "This checks only the energy-charge portion of your bill — not fixed charges, FAC, duty or tax."
    );

    // Billed and estimate rows are shown (uses energyEstimate, NOT energyLawful)
    expect(html).toContain("Energy charge — as billed");
    expect(html).toContain("Standard slab-rate estimate for your units");
    expect(html).not.toContain("Energy charge — lawful pro-rata");

    // Estimate disclaimer caption is rendered
    expect(html).toContain(
      "This is an estimate at MERC standard slab rates for your units. Small differences from your actual bill are normal"
    );

    // Positive confirmation message is honest and estimate-framed, without "same/identical" claim
    expect(html).toContain(
      "Your billed energy charge is at or below our standard-tariff estimate for these units, so there&#x27;s no slab-jump overcharge to challenge."
    );
    expect(html).not.toContain("got the same");
    expect(html).not.toContain("identical");

    // Slab working toggle is available
    expect(html).toContain("See the full slab-by-slab working");

    // Must NOT frame as an overcharge or refund
    expect(html).not.toContain("Likely overcharge");
    expect(html).not.toContain("Energy charge check");
  });

  it("(b) unsupported → calculation-verification block does NOT render", () => {
    const userInput = input({ category: "BPL" });
    const result = runVertical(msedclElectricitySpec, userInput);

    expect(result.diagnosis.classification).toBe("unsupported");
    expect(result.calculation?.unsupported).toBe(true);

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

    // Unsupported alert is rendered
    expect(html).toContain("This tariff isn&#x27;t supported yet");

    // Verification block does NOT render
    expect(html).not.toContain(
      "This checks only the energy-charge portion of your bill"
    );
    expect(html).not.toContain("Energy charge — as billed");
    expect(html).not.toContain("See the full slab-by-slab working");
  });

  it("(c) outside-tariff (noPriceableData) → does NOT render", () => {
    const userInput = input({
      periodFrom: "2018-01-01",
      periodTo: "2018-01-30",
    });
    const result = runVertical(msedclElectricitySpec, userInput);

    expect(result.calculation?.tableLabel).toBe("outside verified tariff data");

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

    // Outside-tariff alert is rendered
    expect(html).toContain("Outside our verified tariff data");

    // Verification block does NOT render
    expect(html).not.toContain(
      "This checks only the energy-charge portion of your bill"
    );
    expect(html).not.toContain("Energy charge — as billed");
    expect(html).not.toContain("See the full slab-by-slab working");
  });

  it("(d) energyChargeMismatch true → mismatch nudge shown, confirmation hidden", () => {
    // Normal ~30-day period with energyChargeBilled (5000) vastly differing from lawful (~588)
    const userInput = input({
      energyChargeBilled: 5000,
      amountBilled: 6000,
    });
    const result = runVertical(msedclElectricitySpec, userInput);

    expect(result.diagnosis.isActionable).toBe(false);
    expect(result.diagnosis.classification).toBe("legitimate");
    expect(result.calculation!.energyChargeMismatch).toBe(true);

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

    // Scope note is still shown
    expect(html).toContain(
      "This checks only the energy-charge portion of your bill — not fixed charges, FAC, duty or tax."
    );

    // Mismatch warning is shown
    expect(html).toContain("Energy charge check");
    expect(html).toContain(
      "The energy charge you entered differs significantly from what the tariff slabs calculate for these units."
    );

    // Confirmation sentence is strictly hidden (honesty guard)
    expect(html).not.toContain("Your billed energy charge is at or below");
    expect(html).not.toContain("We re-priced your units against the");

    // Billed and estimate rows and working toggle remain visible
    expect(html).toContain("Energy charge — as billed");
    expect(html).toContain("Standard slab-rate estimate for your units");
    expect(html).not.toContain("Energy charge — lawful pro-rata");
    expect(html).toContain("See the full slab-by-slab working");
    expect(html).not.toContain("Likely overcharge");
  });

  it("(e) actionable path unchanged", () => {
    // Slab-jump input: long period, actual reading, positive overcharge
    const userInput = input({
      unitsBilled: 150,
      periodFrom: "2026-04-01",
      periodTo: "2026-09-30",
      amountBilled: 1500,
      energyChargeBilled: 936,
    });
    const result = runVertical(msedclElectricitySpec, userInput);

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

    // Actionable path shows Likely overcharge
    expect(html).toContain("Likely overcharge");
    expect(html).toContain("See the full slab-by-slab working");
    expect(html).toContain("Energy charge — as billed");
    expect(html).toContain("Energy charge — lawful pro-rata");

    // Regression guard: actionable path must NOT use legitimate-specific estimate label or disclaimer
    expect(html).not.toContain("Standard slab-rate estimate for your units");
    expect(html).not.toContain(
      "Small differences from your actual bill are normal"
    );

    // Verification scope note is for legitimate, not actionable
    expect(html).not.toContain(
      "This checks only the energy-charge portion of your bill — not fixed charges, FAC, duty or tax."
    );
  });
});
