import { test, expect } from "vitest";
import { t, en, mr } from "./index";

test("t() resolves a dot-path string from the en table", () => {
  expect(t("common.back")).toBe(en.common.back);
  expect(t("guidance.forum")).toBe(en.guidance.forum);
});

test("an unknown key returns the key itself (never 'undefined')", () => {
  expect(t("nope.missing")).toBe("nope.missing");
  expect(t("common.doesNotExist")).toBe("common.doesNotExist");
});

test("t() resolves from the mr table when lang is mr", () => {
  expect(t("common.next", "mr")).toBe(mr.common.next);
  expect(t("common.next", "mr")).not.toBe(en.common.next);
});

test("a key missing in mr falls back to en, then to the key", () => {
  // Every key present in en is present in mr (enforced by the Strings type), so force a miss with a
  // key that exists in neither: it must fall through to the key itself.
  expect(t("results.diagnosis.nonexistent", "mr")).toBe("results.diagnosis.nonexistent");
});

test("a path that resolves to a non-string object returns the key, not the object", () => {
  expect(t("common")).toBe("common");
  expect(t("results.diagnosis", "mr")).toBe("results.diagnosis");
});

test("vars interpolate {name} placeholders in the resolved string", () => {
  expect(t("results.payNoFair", "en", { overcharge: "₹4,200" })).toContain("₹4,200");
  // works with the mr table too, and preserves placeholders that have no matching var
  const out = t("results.workingSentence", "mr", { units: 900, months: 3, monthWord: "महिने", perMonth: 300 });
  expect(out).toContain("900");
  expect(out).toContain("300");
  expect(out).not.toContain("{units}");
});
