// assembleInstrument — pure letter assembly (T5; spec §"Test seams", D10).
//
// Contract (spec D10, "LLM caged"):
//   - The legal scaffolding (Act/section, forum, SLA, prayer, field-list) is DETERMINISTIC template
//     data (see ./templates). This function only places it and interpolates the citizen's own FACTS.
//   - The factual narrative is a HOLE: a string passed in, dropped verbatim into one dedicated section.
//     This function NEVER derives a citation, section or deadline from the narrative — every citation in
//     the output originates in the template constants. The narrative is not even run through fact
//     interpolation, so a `{{...}}` inside it is left untouched.
//   - The self-help disclaimer is appended to EVERY instrument, regardless of the confidence badge.
//
// Pure, no I/O. The `NarrativeGenerator` port (impure) produces the narrative upstream; here it is data.

import type { Language, PerLanguage } from "../types";
import type { InstrumentTemplate } from "./templates";

/** Prior-tier reference, cited by the CGRF / Ombudsman instruments (spec story 10). */
export interface PriorTierFact {
  referenceNo: string;
  date: string;
  outcome?: string;
}

/**
 * The citizen's own facts, interpolated into the scaffold. Every field is optional: a missing value
 * renders as a bracketed prompt (e.g. "[your full name]") so the citizen can fill it in — the tool
 * stores nothing, so not all fields are always known.
 */
export interface InstrumentFacts {
  /** Date on the instrument (display string, e.g. "2 September 2026"). */
  date?: string;
  consumerName?: string;
  /** Full address with PIN / phone / email — a single block. */
  consumerAddress?: string;
  consumerNo?: string;
  connectionNature?: string;
  licensee?: string;
  circle?: string;
  billPeriod?: string;
  unitsBilled?: number;
  amountBilled?: number;
  /** Overcharge estimate in rupees (from the calc engine). Interpolated into the prayer amount only. */
  overchargeEstimate?: number;
  /**
   * Pre-rendered, deterministic "Annexure A" — the slab-by-slab overcharge working
   * (see instruments/annexure.ts). Appended verbatim; referenced from the body. When present the
   * letter substantiates its figure instead of merely asserting it. Never LLM-derived.
   */
  overchargeAnnexure?: string;
  /**
   * The estimate caveat ("this is not a definitive legal figure…"). Shown on-screen with the annexure,
   * but OMITTED from the submission copy — like the disclaimer, it is a hedge addressed to the citizen,
   * not to the forum.
   */
  overchargeCaveat?: string;
  priorTierRef?: PriorTierFact;
}

/** The assembled instrument. `legalBasis` / `prayer` are exposed so callers (and tests) can confirm they are template-verbatim. */
export interface AssembledInstrument {
  instrument: string;
  title: string;
  confidence: InstrumentTemplate["confidence"];
  lang: Language;
  subject: string;
  /** Verbatim primary-source citations — template-only, never narrative-derived. */
  legalBasis: string[];
  /** Relief sought; citation text is verbatim, only the rupee amount is interpolated. */
  prayer: string;
  /** Shown on every instrument regardless of the badge. */
  disclaimer: string;
  /** The full rendered document text, incl. the self-help disclaimer + estimate caveat (for on-screen DocumentPreview). */
  body: string;
  /**
   * The letter as the citizen actually submits it: `body` MINUS the self-help disclaimer and the
   * estimate caveat (citizen-facing hedges that don't belong in a government filing). Copy + download
   * use this; the on-screen preview uses `body`.
   */
  bodyForSubmission: string;
}

/** Sensible fallbacks for missing facts. Known constants fill in; citizen-specific fields get a "[prompt]". */
const FACT_FALLBACK: Record<string, string> = {
  date: "[date]",
  consumerName: "[your full name]",
  consumerAddress: "[your full postal address, with PIN, phone and email]",
  consumerNo: "[your consumer / connection number]",
  connectionNature: "Residential (LT-I-B)",
  licensee: "Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)",
  circle: "[your MSEDCL circle / sub-division, from the bill]",
  billPeriod: "[the disputed billing period]",
  unitsBilled: "[units billed]",
  amountBilled: "[amount billed]",
  overchargeEstimate: "[to be computed from your bill]",
};

/** Replace `{{key}}` tokens with the citizen's facts, or a bracketed prompt when the fact is missing. */
function interpolate(scaffold: string, facts: InstrumentFacts): string {
  return scaffold.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (facts as Record<string, unknown>)[key];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().length === 0);
    if (missing) return FACT_FALLBACK[key] ?? `[${key}]`;
    return String(value);
  });
}

function priorTierBlock(ref: PriorTierFact): string {
  const lines = [
    "Reference to the earlier stage:",
    `Complaint / order reference: ${ref.referenceNo.trim() || "[reference number]"}`,
    `Dated: ${ref.date?.trim() || "[date]"}`,
  ];
  if (ref.outcome && ref.outcome.trim().length > 0) {
    lines.push(`Outcome: ${ref.outcome.trim()}`);
  }
  return lines.join("\n");
}

/**
 * Assemble one instrument. `template` is the per-language map (as stored on the tier/sidecar); `lang`
 * selects the variant, falling back to English (the verified document language). Throws only on a
 * programming error — no template for the requested instrument/language at all.
 */
export function assembleInstrument(
  template: PerLanguage<InstrumentTemplate>,
  facts: InstrumentFacts,
  narrative: string,
  lang: Language = "en"
): AssembledInstrument {
  const t = template[lang] ?? template.en;
  if (!t) {
    throw new Error(`assembleInstrument: no template for language "${lang}" (and no English fallback).`);
  }

  const subject = interpolate(t.subject, facts);
  const prayer = interpolate(t.prayer, facts);
  // The narrative is the HOLE: inserted verbatim, never interpolated, never a source of citations.
  const narrativeBlock = narrative.trim().length > 0
    ? narrative.trim()
    : "[Describe, in your own words, what happened: when the bill arrived, how it compares with your " +
      "usual bills, and why you believe it is wrong.]";

  // Each section is tagged `submit`: true = part of the filed letter; false = on-screen-only hedge
  // (the self-help disclaimer and the estimate caveat) that must not travel into a government filing.
  const sections: { text: string; submit: boolean }[] = [];
  const add = (text: string, submit = true) => sections.push({ text, submit });

  add(t.title);
  add(`Date: ${interpolate("{{date}}", facts)}`);
  add(`To,\n${t.forum}`);
  add(`From,\n${interpolate(t.headerScaffold, facts)}`);
  add(`Subject: ${subject}`);
  add(t.salutation);
  if (facts.priorTierRef) {
    add(priorTierBlock(facts.priorTierRef));
  }
  add(`Statement of facts:\n${narrativeBlock}`);
  add(`Legal grounds:\n${t.legalBasis.map((g) => `- ${g}`).join("\n")}`);
  const hasAnnexure = !!facts.overchargeAnnexure && facts.overchargeAnnexure.trim().length > 0;
  add(
    hasAnnexure
      ? `Relief sought:\n${prayer}\n\nThe detailed slab-by-slab working of the overcharge is set out at Annexure A below.`
      : `Relief sought:\n${prayer}`
  );
  if (t.payUnderProtest) {
    add(t.payUnderProtest);
  }
  add(`Applicable timeline:\n${t.slaText}`);
  if (t.fieldList && t.fieldList.length > 0) {
    add(
      `This application follows the prescribed form; ensure it carries every item below:\n` +
        t.fieldList.map((f) => `  ${f}`).join("\n")
    );
  }
  if (hasAnnexure) {
    add(facts.overchargeAnnexure!.trim());
  }
  // Estimate caveat — display-only (goes with the annexure on-screen, not into the filing).
  if (facts.overchargeCaveat && facts.overchargeCaveat.trim().length > 0) {
    add(facts.overchargeCaveat.trim(), false);
  }
  if (t.draftNote) {
    add(t.draftNote);
  }
  // Self-help disclaimer — display-only.
  add(`—\n${t.disclaimer}`, false);

  return {
    instrument: t.instrument,
    title: t.title,
    confidence: t.confidence,
    lang: template[lang] ? lang : "en",
    subject,
    legalBasis: t.legalBasis,
    prayer,
    disclaimer: t.disclaimer,
    body: sections.map((s) => s.text).join("\n\n"),
    bodyForSubmission: sections.filter((s) => s.submit).map((s) => s.text).join("\n\n"),
  };
}

export default assembleInstrument;
