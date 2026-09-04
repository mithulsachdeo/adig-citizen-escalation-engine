// Optional, device-local resume of the citizen's progress (ticket T8; spec: store-nothing on server).
//
// This is the ONLY persistence in the product and it lives entirely in the browser's localStorage —
// nothing is sent to a server, matching the store-nothing constraint. It captures the intake form, the
// declared stage, the prior-tier reference (so the next instrument can cite the previous tier's
// ref/date/outcome), and which screen the citizen was on, so a returning user can pick up where they left.
//
// All access is SSR-safe (guards `window`) and defensive (any parse/quota error → treated as "no saved
// progress"). A version tag lets us drop incompatible old blobs instead of crashing on a schema change.

import type { FormState, PriorRefState, Screen } from "./state";

const KEY = "adig.check.progress";
const VERSION = 2 as const;

export interface PersistedProgress {
  version: typeof VERSION;
  form: FormState;
  stage: string;
  priorRef: PriorRefState;
  screen: Screen;
  /** ISO timestamp of the save — lets the UI show "saved earlier" and could expire stale resumes. */
  savedAt: string;
}

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    // Some privacy modes throw on merely accessing localStorage.
    return false;
  }
}

/** Load saved progress, or null if none / unreadable / a different schema version. Never throws. */
export function loadProgress(): PersistedProgress | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    if (!parsed || parsed.version !== VERSION || !parsed.form) return null;
    return parsed as PersistedProgress;
  } catch {
    return null;
  }
}

/** Persist progress to this device. No-ops (never throws) if storage is unavailable or full. */
export function saveProgress(p: Omit<PersistedProgress, "version" | "savedAt">): void {
  if (!hasStorage()) return;
  try {
    const record: PersistedProgress = { version: VERSION, savedAt: new Date().toISOString(), ...p };
    window.localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Quota exceeded / disabled storage — resume is a nicety, not a requirement; fail silently.
  }
}

/** Remove any saved progress (called on "start fresh" and "check another bill"). Never throws. */
export function clearProgress(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
