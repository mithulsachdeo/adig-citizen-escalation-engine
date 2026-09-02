import { test, expect } from "vitest";
import { FakeNarrativeGenerator } from "./port";
import type { NarrativeInput } from "./port";

const full: NarrativeInput = {
  billPeriod: "May 2026",
  unitsBilled: 640,
  amountBilled: 8200,
  priorMonthlyAvgUnits: 220,
  readingType: "estimated",
  meterType: "smart",
  userDescription: "bill bahut zyada aaya, meter bhi nahi dekha",
};

test("FakeNarrativeGenerator is deterministic — same input, same output", async () => {
  const gen = new FakeNarrativeGenerator();
  const a = await gen.generate(full);
  const b = await gen.generate(full);
  expect(a).toBe(b);
});

test("weaves in the supplied structured facts", async () => {
  const out = await new FakeNarrativeGenerator().generate(full);
  expect(out).toContain("May 2026");
  expect(out).toContain("640 units");
  expect(out).toContain("220 units");
  expect(out).toContain("estimated");
  expect(out).toContain("smart meter");
  // echoes the citizen's own words verbatim (fake does not translate)
  expect(out).toContain("bill bahut zyada aaya");
});

test("emits NO legal citation, section, SLA, deadline, or forum", async () => {
  const out = (await new FakeNarrativeGenerator().generate(full)).toLowerCase();
  for (const banned of [
    "section",
    "act",
    "regulation",
    "reg ",
    "clause",
    "supply code",
    "cgrf",
    "ombudsman",
    "forum",
    "§",
    "deadline",
    "interest at",
  ]) {
    expect(out).not.toContain(banned);
  }
});

test("degrades gracefully with no facts at all", async () => {
  const out = await new FakeNarrativeGenerator().generate({});
  expect(out.length).toBeGreaterThan(0);
  expect(out).toContain("electricity bill");
});
