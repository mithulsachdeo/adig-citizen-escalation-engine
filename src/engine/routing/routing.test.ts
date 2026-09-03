import { test, expect } from "vitest";
import {
  resolveCgrfRouting,
  getTierRouting,
  CGRF_PUNE_ROUTING,
  CGRF_BARAMATI_ROUTING,
  CGRF_GENERIC_ROUTING,
  OMBUDSMAN_MUMBAI_ROUTING,
  ICRS_ROUTING,
  RTI_ROUTING,
} from "./index";

// The one rule that must never break: correct forum for a known circle, and an HONEST
// fallback (never a guessed forum) for an unknown one. Wrong-forum routing is a product failure.

test("Pune-city circles resolve to CGRF Pune", () => {
  for (const circle of ["Ganeshkhind", "Rastapeth", "Rasta Peth", "Pune (R)", "  ganeshkhind  "]) {
    expect(resolveCgrfRouting(circle)).toBe(CGRF_PUNE_ROUTING);
  }
});

test("Baramati circle resolves to CGRF Baramati (not Pune)", () => {
  expect(resolveCgrfRouting("Baramati")).toBe(CGRF_BARAMATI_ROUTING);
  expect(resolveCgrfRouting("Baramati")).not.toBe(CGRF_PUNE_ROUTING);
});

test("unknown or blank circle fails cleanly — no guess", () => {
  expect(resolveCgrfRouting("Nagpur")).toBeUndefined();
  expect(resolveCgrfRouting("some place")).toBeUndefined();
  expect(resolveCgrfRouting("")).toBeUndefined();
  expect(resolveCgrfRouting("   ")).toBeUndefined();
  expect(resolveCgrfRouting(undefined)).toBeUndefined();
});

test("CGRF-Pune routing omits the volatile phone/email but keeps the stable address", () => {
  expect(CGRF_PUNE_ROUTING.contact).toBeUndefined(); // two official lists disagree → omit, don't guess
  expect(CGRF_PUNE_ROUTING.address).toContain("Pune-411011");
  expect(CGRF_PUNE_ROUTING.verifyAtSource).toBe(true);
});

test("getTierRouting maps each ladder instrument to its verified forum", () => {
  expect(getTierRouting("icrs")).toBe(ICRS_ROUTING);
  expect(getTierRouting("ombudsman-schedule-b")).toBe(OMBUDSMAN_MUMBAI_ROUTING);
  expect(getTierRouting("rti")).toBe(RTI_ROUTING);
});

test("getTierRouting resolves the CGRF tier by circle, and falls back generically when unknown", () => {
  expect(getTierRouting("cgrf-schedule-a", "Ganeshkhind")).toBe(CGRF_PUNE_ROUTING);
  expect(getTierRouting("cgrf-schedule-a", "Baramati")).toBe(CGRF_BARAMATI_ROUTING);
  // Unknown circle → generic (no specific forum/address), never a wrong-forum guess.
  const unknown = getTierRouting("cgrf-schedule-a", "Nagpur");
  expect(unknown).toBe(CGRF_GENERIC_ROUTING);
  expect(unknown?.address).toBeUndefined();
  expect(getTierRouting("cgrf-schedule-a")).toBe(CGRF_GENERIC_ROUTING);
});

test("Pune routes to the Mumbai Ombudsman (never a Pune Ombudsman)", () => {
  expect(OMBUDSMAN_MUMBAI_ROUTING.forumName).toContain("Mumbai");
  expect(OMBUDSMAN_MUMBAI_ROUTING.forumName).not.toContain("Pune");
});

test("unknown instrument id returns undefined", () => {
  expect(getTierRouting("not-a-tier")).toBeUndefined();
});

// ----- filingSteps: the "how to file" walkthrough. Online channels carry a real deep link; offline
// ones carry none (never a fabricated URL). Exactly one step surfaces the citizen's letter. -----

test("ICRS is the only online channel: a real portal deep link, and the letter is COPIED (paste box)", () => {
  const steps = ICRS_ROUTING.filingSteps ?? [];
  expect(steps.length).toBeGreaterThan(0);

  const linked = steps.filter((s) => s.link);
  expect(linked).toHaveLength(1);
  // The verified live entry point (confirmed against the running portal), not the 403'd bare directory.
  expect(linked[0].link?.url).toContain("RegisterComplaint.aspx");
  expect(linked[0].link?.url.startsWith("https://wss.mahadiscom.in/")).toBe(true);

  const letterSteps = steps.filter((s) => s.letterAction);
  expect(letterSteps).toHaveLength(1);
  expect(letterSteps[0].letterAction).toBe("copy");

  // Steps past the OTP wall could not be confirmed read-only → they must be flagged, not asserted.
  expect(steps.some((s) => s.verifyAtSource)).toBe(true);
});

test("offline forums (CGRF, Ombudsman) give real steps but NO fabricated link, and the letter is DOWNLOADED (print)", () => {
  for (const routing of [CGRF_PUNE_ROUTING, CGRF_GENERIC_ROUTING, OMBUDSMAN_MUMBAI_ROUTING]) {
    const steps = routing.filingSteps ?? [];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((s) => s.link === undefined)).toBe(true); // offline: never invent a URL

    const letterSteps = steps.filter((s) => s.letterAction);
    expect(letterSteps).toHaveLength(1);
    expect(letterSteps[0].letterAction).toBe("download");
  }
});

test("the RTI evidence sidecar gets steps but no letter action (the flow generates no RTI letter)", () => {
  const steps = RTI_ROUTING.filingSteps ?? [];
  expect(steps.length).toBeGreaterThan(0);
  expect(steps.every((s) => s.letterAction === undefined)).toBe(true);
  expect(steps.every((s) => s.link === undefined)).toBe(true);
});

test("every filing step carries a textKey (the sentence is resolved via i18n, never inlined)", () => {
  const all = [
    ...(ICRS_ROUTING.filingSteps ?? []),
    ...(CGRF_PUNE_ROUTING.filingSteps ?? []),
    ...(OMBUDSMAN_MUMBAI_ROUTING.filingSteps ?? []),
    ...(RTI_ROUTING.filingSteps ?? []),
  ];
  expect(all.length).toBeGreaterThan(0);
  expect(all.every((s) => typeof s.textKey === "string" && s.textKey.length > 0)).toBe(true);
});
