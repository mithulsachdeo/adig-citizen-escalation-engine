import { test, expect, beforeEach } from "vitest";
import { loadProgress, saveProgress, clearProgress, type PersistedProgress } from "./storage";
import { EMPTY_FORM, EMPTY_PRIOR_REF } from "./state";

// The storage module guards `window`; the node test env has none, so we install a minimal in-memory
// localStorage on a global `window`. This lets us prove round-trip, version gating, and graceful
// failure without a browser.

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: new MemoryStorage() };
});

const sample = {
  form: { ...EMPTY_FORM, unitsBilled: "600", periodFrom: "2026-04-01", periodTo: "2026-09-30" },
  stage: "icrs_ignored",
  priorRef: { ...EMPTY_PRIOR_REF, referenceNo: "ICRS/2026/12345", date: "2026-07-01" },
  screen: "documents" as const,
};

test("save then load round-trips the progress and stamps version + savedAt", () => {
  saveProgress(sample);
  const loaded = loadProgress();
  expect(loaded?.version).toBe(2);
  expect(loaded?.form.unitsBilled).toBe("600");
  expect(loaded?.stage).toBe("icrs_ignored");
  expect(loaded?.priorRef.referenceNo).toBe("ICRS/2026/12345");
  expect(loaded?.screen).toBe("documents");
  expect(typeof loaded?.savedAt).toBe("string");
});

test("loadProgress returns null when nothing is saved", () => {
  expect(loadProgress()).toBeNull();
});

test("a stored blob with a different schema version is ignored", () => {
  const stale = { version: 99, form: EMPTY_FORM } as unknown as PersistedProgress;
  window.localStorage.setItem("adig.check.progress", JSON.stringify(stale));
  expect(loadProgress()).toBeNull();
});

test("corrupt JSON does not throw — treated as no progress", () => {
  window.localStorage.setItem("adig.check.progress", "{not json");
  expect(loadProgress()).toBeNull();
});

test("clearProgress removes the saved progress", () => {
  saveProgress(sample);
  expect(loadProgress()).not.toBeNull();
  clearProgress();
  expect(loadProgress()).toBeNull();
});

test("with no window, load/save/clear are safe no-ops", () => {
  delete (globalThis as unknown as { window?: unknown }).window;
  expect(() => saveProgress(sample)).not.toThrow();
  expect(loadProgress()).toBeNull();
  expect(() => clearProgress()).not.toThrow();
});
