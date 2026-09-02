import { test, expect } from "vitest";
import {
  buildNarrativePrompt,
  buildNarrativeUserContent,
  NARRATIVE_SYSTEM_PROMPT,
} from "./prompt";
import type { NarrativeInput } from "./port";

const input: NarrativeInput = {
  billPeriod: "May 2026",
  unitsBilled: 640,
  amountBilled: 8200,
  priorMonthlyAvgUnits: 220,
  readingType: "estimated",
  userDescription: "मला वाटतं बिल चुकीचं आहे",
};

test("system prompt cages the model: English-only, facts-only, no legal content", () => {
  const s = NARRATIVE_SYSTEM_PROMPT.toLowerCase();
  expect(s).toContain("english");
  expect(s).toContain("first person");
  // explicit prohibitions on legal scaffolding
  expect(s).toContain("section");
  expect(s).toContain("regulation");
  expect(s).toContain("forum");
  expect(s).toContain("deadline");
  expect(s).toContain("do not invent");
});

test("user content carries the supplied facts and the citizen's raw words", () => {
  const u = buildNarrativeUserContent(input);
  expect(u).toContain("May 2026");
  expect(u).toContain("640");
  expect(u).toContain("8200");
  expect(u).toContain("220");
  expect(u).toContain("estimated");
  // free text passed through untouched for the model to normalize
  expect(u).toContain("मला वाटतं बिल चुकीचं आहे");
});

test("omits facts that were not provided (no 'undefined' leakage)", () => {
  const u = buildNarrativeUserContent({ unitsBilled: 500 });
  expect(u).toContain("500");
  expect(u).not.toContain("undefined");
  expect(u).not.toContain("Amount billed");
  expect(u).not.toContain("Usual monthly units");
});

test("buildNarrativePrompt is deterministic and pairs system + user", () => {
  const a = buildNarrativePrompt(input);
  const b = buildNarrativePrompt(input);
  expect(a).toEqual(b);
  expect(a.system).toBe(NARRATIVE_SYSTEM_PROMPT);
  expect(a.user).toBe(buildNarrativeUserContent(input));
});
