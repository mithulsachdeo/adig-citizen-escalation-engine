// i18n seam (ticket T8, extended for Marathi). UI language is decoupled from document language.
//
// `t("guidance.forum")` resolves a dot path against the active language's table, falling back to `en`,
// then to the key itself (so a missing string is visible, never "undefined"). Optional `vars` interpolate
// `{name}` placeholders — used by the few sentences that embed figures (e.g. the pay-under-protest line).
//
// This module is pure and framework-free (usable in tests and the engine). Runtime language *state* and
// the `useT()` hook live in ./context (a client component). v1 ships EN + a beta, machine-drafted MR.

import type { Language } from "@/engine/types";
import { en } from "./en";
import { mr } from "./mr";

/** Languages with a populated table. The switcher and persistence validate against this. */
export const SUPPORTED_LANGUAGES = ["en", "mr"] as const;

/** Default UI language. Marathi is opt-in via the switcher; EN is the safe, reviewed default. */
export const UI_LANGUAGE: Language = "en";

const TABLES: Partial<Record<Language, unknown>> = { en, mr };

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

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * Resolve a dot-path UI string, e.g. `t("common.back")`. Falls back to `en`, then to the key.
 * Pass `vars` to interpolate `{name}` placeholders. Never throws and never returns "undefined".
 */
export function t(
  key: string,
  lang: Language = UI_LANGUAGE,
  vars?: Record<string, string | number>,
): string {
  const path = key.split(".");
  const resolved = lookup(TABLES[lang], path) ?? lookup(TABLES.en, path) ?? key;
  return vars ? interpolate(resolved, vars) : resolved;
}

export { en, mr };
export type { Strings } from "./en";
