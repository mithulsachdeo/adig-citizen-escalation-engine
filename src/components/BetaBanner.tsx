"use client";
// Dismissible banner shown only while Marathi is active: the MR table is machine-drafted and unreviewed,
// so this states plainly that English is authoritative. Dismissal persists on the device (store-nothing:
// a single boolean preference). `app-chrome` keeps it out of any printed document.

import React, { useEffect, useState } from "react";
import { useLanguage, useT } from "@/i18n/context";

const DISMISS_KEY = "adig.mrBetaDismissed";

export function BetaBanner() {
  const { lang } = useLanguage();
  const t = useT();
  const [dismissed, setDismissed] = useState(true); // default hidden until we've read the pref (no flash)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (lang !== "mr" || dismissed) return null;

  return (
    <div className="adig-beta-banner app-chrome" role="status">
      <span className="adig-beta-banner__text">{t("beta.bannerText")}</span>
      <button
        type="button"
        className="adig-beta-banner__dismiss"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
      >
        {t("beta.dismiss")}
      </button>
    </div>
  );
}

export default BetaBanner;
