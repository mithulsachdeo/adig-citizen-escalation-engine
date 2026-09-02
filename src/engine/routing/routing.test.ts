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
