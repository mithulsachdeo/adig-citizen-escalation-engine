"use client";
// Runtime UI-language state (Marathi support). The `t()` seam in ./index is pure and language-agnostic;
// this client layer holds the *active* language, persists the choice locally (store-nothing: a single
// preference key, no PII), and hands components a `useT()` bound to that language so they re-render on
// switch. EN is the default; MR is opt-in via the header switcher and is a beta, machine-drafted table.

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Language } from "@/engine/types";
import { t as translate, SUPPORTED_LANGUAGES } from "./index";

const STORAGE_KEY = "adig.lang";

type LanguageContextValue = { lang: Language; setLang: (l: Language) => void };

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start at "en" so server and first client render agree; hydrate the saved choice after mount.
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
        setLangState(saved as Language);
      }
    } catch {
      /* localStorage unavailable — stay on the default */
    }
  }, []);

  // Keep the document language attribute in sync for accessibility / screen readers.
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      /* no document (tests) */
    }
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore persistence failure */
    }
  }, []);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/**
 * Returns a `t` bound to the active language. Call `t("key")` or `t("key", { name: value })`
 * for interpolation. Re-renders consumers when the language changes.
 */
export function useT() {
  const { lang } = useLanguage();
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars),
    [lang],
  );
}
