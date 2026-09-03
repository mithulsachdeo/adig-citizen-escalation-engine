"use client";
// EN / मराठी (बीटा) segmented toggle for the masthead. Reads and sets the active UI language; the
// choice persists via LanguageProvider (localStorage). Marathi is labelled beta because the table is
// machine-drafted and unreviewed.

import React from "react";
import { useLanguage } from "@/i18n/context";
import { t } from "@/i18n";
import type { Language } from "@/engine/types";

const OPTIONS: { code: Language; labelKey: string }[] = [
  { code: "en", labelKey: "switcher.en" },
  { code: "mr", labelKey: "switcher.mr" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="adig-langswitch" role="group" aria-label={t("switcher.ariaLabel", lang)}>
      {OPTIONS.map((o) => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => setLang(o.code)}
            aria-pressed={active}
            className={`adig-langswitch__opt${active ? " is-active" : ""}`}
            lang={o.code}
          >
            {t(o.labelKey, lang)}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
