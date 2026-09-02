// Caged prompt builder for the narrative model (T6; spec D10, story 12).
//
// Pure and deterministic so the cage can be unit-tested without the network. Both the serverless
// route (src/app/api/narrative) and the tests build the prompt through here — there is one cage,
// defined once. The cage's whole job: the model writes ONLY the plain-English facts paragraph and
// touches NOTHING legal. Every citation, section, SLA, deadline, and forum in the final document
// comes from the deterministic templates (../instruments), never from this model.

import type { NarrativeInput } from "./port";

export interface NarrativePrompt {
  /** Behavioural cage — passed as Gemini `system_instruction`. */
  system: string;
  /** The citizen's facts — passed as the user turn. */
  user: string;
}

/**
 * The cage. Kept as a single constant so it is auditable and testable in one place. Written as
 * hard prohibitions because the downstream document depends on the model staying in its lane.
 */
export const NARRATIVE_SYSTEM_PROMPT = [
  "You draft ONE short factual paragraph — the \"statement of facts\" — for a complaint by an",
  "Indian electricity consumer about a suspected overbilling. You are not a lawyer and you do not",
  "give legal advice. Follow every rule below without exception:",
  "",
  "1. Write in plain, clear English only. If the consumer's account is in another language or",
  "   script (Hindi, Marathi, Hinglish, romanized, or mixed), translate and normalize it to English.",
  "2. State ONLY facts: what the bill showed, how it compares with the consumer's usual usage,",
  "   when it happened, and why the consumer believes it is wrong. Write in the first person (\"I\").",
  "3. Do NOT mention, cite, or paraphrase any law, Act, section, regulation, rule, clause, service",
  "   level, timeline, deadline, penalty, interest, refund entitlement, forum, office, ombudsman,",
  "   or authority. All legal content is added separately and must not appear here.",
  "4. Do NOT draw legal conclusions, demand relief, or state what the consumer is entitled to.",
  "5. Do NOT invent facts, figures, or dates that were not provided.",
  "6. Keep it to 3-6 sentences. Output only the paragraph: no heading, label, preamble, or sign-off.",
].join("\n");

/** Build the user turn from the structured facts + the citizen's free text. Deterministic. */
export function buildNarrativeUserContent(input: NarrativeInput): string {
  const lines: string[] = [
    "Write the statement-of-facts paragraph from the following details.",
    "",
  ];

  const fact = (label: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim().length === 0) return;
    lines.push(`- ${label}: ${typeof value === "string" ? value.trim() : value}`);
  };

  fact("Disputed billing period", input.billPeriod);
  fact("Units billed", input.unitsBilled);
  fact("Amount billed (rupees)", input.amountBilled);
  fact("Usual monthly units", input.priorMonthlyAvgUnits);
  fact("Meter reading type", input.readingType);
  fact("Meter type", input.meterType);

  const desc = input.userDescription?.trim();
  if (desc) {
    lines.push("");
    lines.push("Consumer's own account (may be in any language; normalize to English):");
    lines.push(desc);
  }

  return lines.join("\n");
}

/** Assemble the full caged prompt for the generateContent call. */
export function buildNarrativePrompt(input: NarrativeInput): NarrativePrompt {
  return {
    system: NARRATIVE_SYSTEM_PROMPT,
    user: buildNarrativeUserContent(input),
  };
}

export default buildNarrativePrompt;
