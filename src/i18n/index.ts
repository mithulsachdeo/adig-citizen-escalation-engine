// Tiny i18n seam (ticket T8). UI language is decoupled from document language; v1 ships EN only.
//
// `t("guidance.forum")` resolves a dot path against the active language's table, falling back to `en`,
// then to the key itself (so a missing string is visible, never "undefined"). This is intentionally
// minimal — no interpolation, no pluralization — because v1 has a single language and the goal is only
// to establish the seam. Add richer behaviour if/when a second language actually lands.

import type { Language } from "@/engine/types";
import { en } from "./en";

/** The language the UI renders in. v1 is English only; this is the single switch to change later. */
export const UI_LANGUAGE: Language = "en";

// Only `en` is populated in v1. A future `mr` maps to its own table here.
const TABLES: Partial<Record<Language, unknown>> = { en };

function lookup(table: unknown, path: string[]): string | undefined {
  let node: unknown = table;
  for (const seg of path) {
    if (node && typeof node === "object" && seg in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Resolve a dot-path UI string, e.g. `t("common.back")`. Falls back to `en`, then to the key.
 * Never throws and never returns "undefined" — a missing key renders as the key so it is spottable.
 */
export function t(key: string, lang: Language = UI_LANGUAGE): string {
  const path = key.split(".");
  const active = lookup(TABLES[lang], path);
  if (active !== undefined) return active;
  const fallback = lookup(TABLES.en, path);
  if (fallback !== undefined) return fallback;
  return key;
}

export { en };
export type { Strings } from "./en";
