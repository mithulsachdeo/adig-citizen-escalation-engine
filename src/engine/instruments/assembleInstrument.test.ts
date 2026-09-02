import { test, expect } from "vitest";
import { assembleInstrument, type InstrumentFacts } from "./assembleInstrument";
import { INSTRUMENT_TEMPLATES, getInstrumentTemplate } from "./templates";

// T5 acceptance (spec §"Tests → instruments"): given fixed facts + a STUBBED narrative, the
// deterministic legal scaffolding (correct Act/section, forum, deadline) appears VERBATIM; NO citation
// originates from the narrative slot; a draft-confidence tier renders its "draft — confirm" label.

const FACTS: InstrumentFacts = {
  date: "2 September 2026",
  consumerName: "Asha Kulkarni",
  consumerAddress: "12 Rasta Peth, Pune-411011, 98xxxxxx01, asha@example.com",
  consumerNo: "170012345678",
  connectionNature: "Residential (LT-I-B)",
  circle: "Rasta Peth",
  billPeriod: "1 April 2026 to 30 September 2026",
  unitsBilled: 150,
  amountBilled: 1450,
  overchargeEstimate: 342,
};

// A stubbed narrative that deliberately smuggles a BOGUS citation. If any legal scaffolding leaked from
// the narrative slot, this fake would show up in `legalBasis` / `prayer`. It must not.
const STUB_NARRATIVE =
  "My meter was not read for six months and the whole 150 units were billed in one month. " +
  "The bill wrongly cites Section 999 of the Imaginary Electricity Act, 2099 and Regulation 42.42.42.";

const CITATION_FROM_NARRATIVE = /Section 999|Imaginary Electricity Act|42\.42\.42/;

test("ICRS: deterministic Act/section, forum and deadline appear verbatim; overcharge amount interpolated", () => {
  const r = assembleInstrument(INSTRUMENT_TEMPLATES.icrs, FACTS, STUB_NARRATIVE, "en");

  expect(r.instrument).toBe("icrs");
  expect(r.confidence).toBe("verified");

  // Verbatim citations from the template constants.
  expect(r.body).toContain("Regulation 16.1.1 proviso");
  expect(r.body).toContain("Section 62(6) of the Electricity Act, 2003");
  expect(r.body).toContain("proviso to Section 56(1) of the Electricity Act, 2003"); // pay-under-protest
  expect(r.body).toContain("15 working days"); // ICRS billing deadline

  // Citizen facts interpolated.
  expect(r.body).toContain("Asha Kulkarni");
  expect(r.body).toContain("1 April 2026 to 30 September 2026");
  expect(r.prayer).toContain("Rs 342");

  // The narrative itself is present (it is the facts paragraph)...
  expect(r.body).toContain("was not read for six months");
  // ...but its bogus citations never leaked into the deterministic legal fields.
  expect(r.legalBasis.join("\n")).not.toMatch(CITATION_FROM_NARRATIVE);
  expect(r.prayer).not.toMatch(CITATION_FROM_NARRATIVE);
});

test("no citation originates from the narrative: legal fields are byte-identical with any narrative", () => {
  const withStub = assembleInstrument(INSTRUMENT_TEMPLATES.icrs, FACTS, STUB_NARRATIVE, "en");
  const withEmpty = assembleInstrument(INSTRUMENT_TEMPLATES.icrs, FACTS, "", "en");
  const withOtherJunk = assembleInstrument(
    INSTRUMENT_TEMPLATES.icrs,
    FACTS,
    "Totally different text mentioning Section 12345 and a fake deadline of 3 days.",
    "en"
  );

  // Whatever the narrative says, the legal scaffolding is exactly the template's — proving it is not
  // sourced from the narrative slot.
  expect(withStub.legalBasis).toEqual(getInstrumentTemplate("icrs")!.legalBasis);
  expect(withStub.legalBasis).toEqual(withEmpty.legalBasis);
  expect(withStub.legalBasis).toEqual(withOtherJunk.legalBasis);
  expect(withStub.prayer).toEqual(withEmpty.prayer);
  expect(withStub.prayer).toEqual(withOtherJunk.prayer);

  // Empty narrative still yields a valid instrument with all citations present.
  expect(withEmpty.body).toContain("Section 62(6)");
  expect(withEmpty.body).toContain("Regulation 16.1.1 proviso");
});

test("CGRF Schedule A: correct forum, Schedule A field-list, 60-working-day deadline, prior-tier ref cited", () => {
  const facts: InstrumentFacts = {
    ...FACTS,
    priorTierRef: { referenceNo: "ICRS/PUN/2026/0042", date: "5 August 2026", outcome: "no response" },
  };
  const r = assembleInstrument(INSTRUMENT_TEMPLATES["cgrf-schedule-a"], facts, STUB_NARRATIVE, "en");

  expect(r.confidence).toBe("verified");
  expect(r.title).toContain("Schedule A");
  expect(r.body).toContain("Consumer Grievance Redressal Forum");
  expect(r.body).toContain("60 working days");
  expect(r.body).toContain("two (2) years"); // limitation
  // Schedule A field-list items appear verbatim.
  expect(r.body).toContain("3. Particulars of connection and consumer number");
  expect(r.body).toContain("who is not an Advocate");
  // Prior ICRS complaint cited (spec story 10).
  expect(r.body).toContain("ICRS/PUN/2026/0042");
  expect(r.body).toContain("no response");
  // No leakage.
  expect(r.legalBasis.join("\n")).not.toMatch(CITATION_FROM_NARRATIVE);
});

test("Ombudsman Schedule B: Mumbai forum, Schedule B field-list, 60-day representation window", () => {
  const r = assembleInstrument(INSTRUMENT_TEMPLATES["ombudsman-schedule-b"], FACTS, STUB_NARRATIVE, "en");

  expect(r.confidence).toBe("verified");
  expect(r.title).toContain("Schedule B");
  expect(r.body).toContain("Electricity Ombudsman (Mumbai)");
  expect(r.body).toContain("within 60 days of the Forum's order");
  expect(r.body).toContain("11. Monetary loss / compensation claimed");
  expect(r.body).toContain("High Court"); // honest end-of-road statement
});

test("RTI sidecar renders DRAFT confidence and its 'confirm before sending' fee note", () => {
  const r = assembleInstrument(INSTRUMENT_TEMPLATES.rti, FACTS, STUB_NARRATIVE, "en");

  expect(r.confidence).toBe("draft");
  expect(r.title).toContain("Right to Information Act, 2005");
  // Draft label + the specific unconfirmed-fee caveat.
  expect(r.body).toContain("DRAFT — confirm before sending");
  expect(r.body).toContain("Rs 10 to Rs 30");
  expect(r.body).toContain("30 days"); // PIO reply deadline
});

test("self-help disclaimer + Advocate-bar note appear on EVERY instrument regardless of badge", () => {
  for (const id of ["icrs", "cgrf-schedule-a", "ombudsman-schedule-b", "rti"] as const) {
    const r = assembleInstrument(INSTRUMENT_TEMPLATES[id], FACTS, STUB_NARRATIVE, "en");
    expect(r.disclaimer).toBeTruthy();
    expect(r.body).toContain("self-help draft");
    expect(r.body).toContain("Advocate cannot appear as your representative");
  }
});

test("missing facts render as bracketed prompts, not blanks or 'undefined'", () => {
  const r = assembleInstrument(INSTRUMENT_TEMPLATES.icrs, { billPeriod: "May 2026" }, "", "en");
  expect(r.body).toContain("[your full name]");
  expect(r.body).toContain("[your consumer / connection number]");
  expect(r.body).not.toContain("undefined");
});

test("unknown language falls back to the verified English template", () => {
  const r = assembleInstrument(INSTRUMENT_TEMPLATES.icrs, FACTS, STUB_NARRATIVE, "mr");
  expect(r.lang).toBe("en"); // fell back
  expect(r.body).toContain("Section 62(6)");
});
