import { test, expect } from "vitest";
import { t, en } from "./index";

test("t() resolves a dot-path string from the en table", () => {
  expect(t("common.back")).toBe(en.common.back);
  expect(t("guidance.forum")).toBe(en.guidance.forum);
});

test("an unknown key returns the key itself (never 'undefined')", () => {
  expect(t("nope.missing")).toBe("nope.missing");
  expect(t("common.doesNotExist")).toBe("common.doesNotExist");
});

test("a non-en language falls back to en (v1 ships en only)", () => {
  expect(t("common.next", "mr")).toBe(en.common.next);
});

test("a path that resolves to a non-string object returns the key, not the object", () => {
  expect(t("common")).toBe("common");
});
