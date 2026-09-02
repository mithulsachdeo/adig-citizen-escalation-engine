// English UI strings (ticket T8). This is the ONLY language shipped in v1.
//
// This is the *UI-language* seam — deliberately decoupled from the *document* language. The generated
// legal instruments are English-only and their wording is owned by the deterministic instrument
// templates (verbatim from the verification pass); those never route through t(). This table is only
// for chrome: buttons, screen titles, guidance labels. Adding a `mr.ts` sibling later is the whole
// extent of "add a language" — no call sites change. v1 ships EN only; do not add Marathi here.

export const en = {
  common: {
    back: "Back",
    next: "Continue",
    checkAnother: "Check another bill",
  },
  screens: {
    intake: "Check your bill",
    results: "What we found",
    documents: "Your escalation document",
    guidance: "How to submit",
  },
  guidance: {
    submitTitle: "Where and how to file",
    submitIntro:
      "File the document you generated at the forum below. Keep a copy and a record of the date you submitted it.",
    forum: "Forum / office",
    howToFile: "How to file",
    address: "Address",
    contact: "Contact",
    timeline: "Timeline / deadline",
    noSubmissionTitle: "No submission needed",
    noSubmissionBody: "There is no escalation for this bill, so there is nothing to file.",
    verifyAtSource:
      "Contact details for this forum can change — confirm the current address and channel from the official MSEDCL / MERC source before you send.",
    optionalEvidence: "Optional evidence tool",
    advocateTitle: "You present the matter yourself",
    advocateBody:
      "At the CGRF and the Electricity Ombudsman an Advocate cannot appear as your representative (MERC CGRF & EO Regulations, 2020). A lawyer may help you draft, but you present it yourself. Adig is a self-help tool, not legal advice.",
  },
  resume: {
    title: "Resume where you left off?",
    body: "We saved your progress on this device only. Nothing was sent to a server.",
    resume: "Resume",
    startFresh: "Start fresh",
  },
} as const;

/** Shape of a complete strings table — a `mr.ts` sibling must satisfy this. */
export type Strings = typeof en;

export default en;
