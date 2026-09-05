import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GuidanceStep } from "./GuidanceStep";
import { ResultsStep } from "./ResultsStep";
import { Badge } from "@/components/Badge";
import { LanguageProvider } from "@/i18n/context";
import { mr } from "@/i18n/mr";
import { ICRS_ROUTING, CGRF_PUNE_ROUTING } from "@/engine/routing";
import type { PipelineResult, Routing, Tier } from "@/engine/types";

describe("Marathi i18n and English fallback", () => {
  const baseResult: PipelineResult = {
    diagnosis: {
      isActionable: true,
      classification: "slab_jump",
      summary: "Sample summary",
      rationale: "Sample rationale",
    },
    calculation: {
      actualEnergyCharge: 1000,
      lawfulEnergyCharge: 800,
      overcharge: 200,
      actualBreakdown: [],
      lawfulBreakdown: [],
      tableLabel: "FY2026-27",
      estimateCaveat: "Estimate caveat",
    },
    evidence: [],
    tier: {
      order: 1,
      instrument: "icrs",
      instrumentName: "Internal complaint to MSEDCL (ICRS)",
      instrumentNameMr: "महावितरण अंतर्गत तक्रार (ICRS)",
      tierTemplate: { en: { title: "Title" } },
      legalGrounds: [],
      routing: ICRS_ROUTING,
      requiresPriorTierRef: false,
      confidence: "verified",
      stage: "new",
    },
    instrument: "icrs",
  };

  it("fallback test: a Routing-shaped object with no forumNameMr returns/renders English forumName under mr", () => {
    const fallbackRouting: Routing = {
      forumName: "Special English Only Forum",
      channel: "English Channel Only",
      address: "123 English Street, Mumbai",
      slaText: "Resolution in 10 days",
    };

    const tierWithFallback: Tier = {
      order: 1,
      instrument: "custom",
      instrumentName: "Custom Tier",
      tierTemplate: { en: { title: "Title" } },
      legalGrounds: [],
      routing: fallbackRouting,
      requiresPriorTierRef: false,
      confidence: "draft",
    };

    const result: PipelineResult = {
      ...baseResult,
      tier: tierWithFallback,
      instrument: "custom",
    };

    const html = renderToString(
      <LanguageProvider initialLang="mr">
        <GuidanceStep result={result} onBack={() => {}} onRestart={() => {}} />
      </LanguageProvider>
    );

    // English forumName rendered because forumNameMr is undefined
    expect(html).toContain("Special English Only Forum");
    expect(html).toContain("English Channel Only");
    expect(html).toContain("Resolution in 10 days");
  });

  it("positive test: routing with forumNameMr/channelMr/slaTextMr renders Marathi and preserves English address", () => {
    const tierWithPuneCgrf: Tier = {
      order: 2,
      instrument: "cgrf-schedule-a",
      instrumentName: "Application to CGRF (Schedule A)",
      instrumentNameMr: "ग्राहक तक्रार निवारण मंच (CGRF) कडे अर्ज (अनुसूची अ)",
      tierTemplate: { en: { title: "Title" } },
      legalGrounds: [],
      routing: CGRF_PUNE_ROUTING,
      requiresPriorTierRef: true,
      confidence: "verified",
      stage: "icrs_ignored",
    };

    const result: PipelineResult = {
      ...baseResult,
      tier: tierWithPuneCgrf,
      instrument: "cgrf-schedule-a",
    };

    const html = renderToString(
      <LanguageProvider initialLang="mr">
        <GuidanceStep
          result={result}
          circle="Pune (R)"
          onBack={() => {}}
          onRestart={() => {}}
        />
      </LanguageProvider>
    );

    // Marathi prose
    expect(html).toContain("ग्राहक तक्रार निवारण मंच, महावितरण (पुणे)");
    expect(html).toContain("प्रत्यक्ष, टपालाने, ईमेलद्वारे किंवा CGRF वेब पोर्टलद्वारे");
    expect(html).toContain("कारवाईचे कारण घडल्यापासून २ वर्षांच्या आत दाखल करा; मंच ६० कामकाजाच्या दिवसांत आपला आदेश जारी करतो.");

    // English address preserved verbatim
    expect(html).toContain("925, Kasaba Peth, Administrative Building, 2nd floor, Pune-411011");
  });

  it("Badge under Marathi renders mr.common.draftConfirm, and ResultsStep renders निदान", () => {
    // 1. Badge under Marathi
    const badgeHtml = renderToString(
      <LanguageProvider initialLang="mr">
        <Badge variant="draft" />
      </LanguageProvider>
    );
    expect(badgeHtml).toContain(mr.common.draftConfirm);
    expect(badgeHtml).toContain("मसुदा — पाठवण्यापूर्वी खात्री करा");

    // 2. Diagnosis eyebrow in ResultsStep under Marathi
    const resultsHtml = renderToString(
      <LanguageProvider initialLang="mr">
        <ResultsStep result={baseResult} onBack={() => {}} onNext={() => {}} />
      </LanguageProvider>
    );
    expect(resultsHtml).toContain("निदान");
    expect(resultsHtml).not.toContain("Diagnosis");
  });
});
