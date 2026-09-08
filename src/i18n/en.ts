// English UI strings (ticket T8, extended for Marathi coverage).
//
// This is the *UI-language* table. It is the canonical shape: `mr.ts` must satisfy `Strings` (the
// `typeof en` type), so a missing Marathi key is a COMPILE error, not a runtime surprise. English values
// here are verbatim the on-screen copy, so EN mode renders identically to before this table existed.
//
// Interpolated values use `{name}` placeholders resolved by `t(key, lang, vars)`.
//
// NOTE ON SCOPE: the generated legal *instruments* (the letters) are owned by the deterministic
// instrument templates and never route through `t()`. This table does, however, carry the engine's
// on-screen *explanatory* text (diagnosis summaries, the estimate caveat, evidence descriptions) so the
// results screen can toggle — the English here mirrors the engine's own strings exactly, and the Marathi
// is beta.

export const en = {
  common: {
    back: "Back",
    next: "Continue",
    checkMyBill: "Check my bill",
    checkAnother: "Check another bill",
    getMyDocument: "Get my document",
    select: "Select…",
    verified: "Verified",
    draftConfirm: "Draft — confirm before sending",
  },
  switcher: {
    // Shown identically in both languages (they are language names), but kept here for one source of truth.
    en: "EN",
    mr: "मराठी (बीटा)",
    ariaLabel: "Choose language",
  },
  screens: {
    intake: "Check your bill",
    results: "What we found",
    documents: "Your escalation document",
    guidance: "How to submit",
  },
  // Step-progress tracker labels (the check flow's 5 stages).
  progress: {
    diagnose: "Diagnose",
    calculate: "Calculate",
    evidence: "Evidence",
    document: "Document",
    submit: "Submit",
  },
  landing: {
    chip: "For Maharashtra / MSEDCL bills",
    h1: "Your electricity bill looks too high?",
    lead:
      "Adig checks whether you were overcharged, estimates by how much, and generates the exact complaint to get it corrected — for free, with nothing stored.",
    ctaCheck: "Check my bill",
    ctaSub: "~2 minutes · No sign-up · Nothing saved",
    howTitle: "How Adig helps",
    stepLabel: "Step",
    flow: {
      diagnoseLabel: "Diagnose",
      diagnoseDesc: "Find out what went wrong with your bill.",
      calculateLabel: "Calculate",
      calculateDesc: "Estimate how much you were overcharged.",
      evidenceLabel: "Evidence",
      evidenceDesc: "Know exactly what to gather.",
      generateLabel: "Generate",
      generateDesc: "Get the right complaint, filled in for you.",
      submitLabel: "Submit",
      submitDesc: "Where and how to file it — step by step.",
    },
    reassureHeading: "Afraid your power will be cut?",
    reassureAlertTitle: "Pay the fair amount under protest — keep your power on",
    reassureAlertBody:
      "You get at least 15 days’ notice before any disconnection. Adig tells you the specific fair amount to pay under written protest so your connection stays on while you dispute the rest.",
    sampleResult: "Sample result",
    likelyOvercharge: "Likely overcharge",
    sampleEnergyBilled: "Energy charge — as billed",
    sampleEnergyLawful: "Energy charge — lawful pro-rata",
    sampleCaption: "Example only. Estimated on the energy-charge component, per MERC Supply Code Reg 16.1.1.",
  },
  footer: {
    disclaimerStrong: "Adig is a self-help tool, not legal advice.",
    disclaimerBody:
      " Using it does not create a lawyer–client relationship. Overcharge figures are estimates based on the standard monthly pro-rata rule (MERC Supply Code 2021, Regulation 16.1.1) — not a final legal determination. Review every detail and confirm the current forum contact before you send anything.",
    privacyStrong: "Your privacy:",
    privacyBody:
      " we store nothing you enter. Your bill details stay on your device. The only thing that leaves it is the short description you choose to write, which is sent to our AI provider solely to draft one plain-language paragraph and is not retained. We keep no account and record only anonymous, non-identifying usage counts.",
  },
  billGuide: {
    toggle: "Not sure where to find these? See a sample bill",
    intro:
      "This is a sample MSEDCL bill with personal details removed. The markers show where each detail sits — look in the same places on your own bill.",
    caption: "Sample bill — personal details removed.",
    note: "Meter type and whether your meter was recently replaced are not printed on the bill — only you know those.",
    legend: {
      units: "Units billed",
      period: "Billing period — the two reading dates",
      amount: "Amount billed",
      reading: "Reading type — look for “Meter Status”",
      category: "Consumer category",
      priorAvg: "Prior monthly average — from the 12-month chart",
      circle: "Your circle / division",
    },
  },
  upload: {
    title: "Scan your bill to auto-fill",
    subtitle: "Upload a PDF or photo of your bill. Everything stays in your browser — zero data leaves your device.",
    cta: "Upload bill (PDF or photo)",
    dropzone: "Drag and drop your bill here, or browse",
    formats: "PDF, JPG, PNG, HEIC, WebP up to 10MB",
    pdfPreference: "For the most accurate read, upload the PDF from the MSEDCL portal or app. A clear photo works too, but may need a few corrections.",
    downloadingOcr: "Preparing text recognition engine...",
    recognizing: "Reading details from your bill...",
    validating: "Validating file...",
    rendering: "Scanning document...",
    successAlert: "Found {count} details. Review them below before checking your bill.",
    autoFilledBadge: "We read this — check it",
    energyChargeNote: "We couldn't read Energy Charges — please enter it manually from your bill.",
    verifyEnergyChargeNote: "We read ₹{amount} for Energy Charges from page 2 of your bill. Please verify this matches your bill's 'Energy Charges' line before checking.",
    reuploadNotice: "Updated from your new upload — earlier auto-filled values were cleared.",
    errorNotMsedcl: "This doesn't appear to be an MSEDCL (Mahavitaran) electricity bill. Please enter details manually.",
    errorTooLarge: "File exceeds the 10MB size limit. Please upload a smaller bill file.",
    errorInvalidType: "Unsupported file format. Please upload a PDF, PNG, JPG, HEIC, or WebP image.",
    errorUnreadable: "Could not read text from this bill clearly. Please type your details manually below.",
    errorGeneric: "Unable to scan this file. Please fill out the form manually.",
  },
  intake: {
    orEnterManually: "Or enter your bill details manually",
    legend: "Enter the details from your disputed bill. We store nothing you type.",
    unitsLabel: "Units billed (kWh)",
    periodFrom: "Billing period — from",
    periodTo: "Billing period — to",
    amountLabel: "Amount billed (Rs)",
    amountPlaceholder: "Total bill amount from your bill (e.g. 1500)",
    energyChargeLabel: "Energy charges shown on your bill (Rs)",
    energyChargePlaceholder: "From your bill (e.g. 950)",
    energyChargeHelp: "Look for the 'Energy Charges' line item under billing details on your bill.",
    readingLabel: "Reading type",
    readingHelp: "On the bill, usually shown near the meter reading.",
    readingActual: "Actual",
    readingEstimated: "Estimated / Average",
    categoryLabel: "Consumer category",
    categoryResidential: "Residential (LT-I-B)",
    circleLabel: "MSEDCL circle / sub-division",
    circlePlaceholder: "From your bill (optional)",
    circleHelp: "Your circle is printed on your bill. It picks the exact CGRF office if you escalate.",
    circleNotSure: "Not sure / other circle",
    meterLabel: "Meter type",
    meterRegular: "Regular",
    meterSmart: "Smart meter",
    meterPlaceholder: "Optional",
    priorAvgLabel: "Prior monthly average units",
    priorAvgPlaceholder: "Your usual monthly usage (optional)",
    recentSwapLabel: "Meter was recently replaced",
    recentSwapHelp: "Tick this if a new (often smart) meter was installed just before this bill.",
    submit: "Check my bill",
    notOnBill: "not on your bill",
  },
  results: {
    diagnosisEyebrow: "Diagnosis",
    fallbackTitle: "Result",
    title: {
      slab_jump: "Slab-jump overcharge detected",
      average_billing: "Estimated / average-billing overcharge detected",
      smart_meter_catch_up: "Meter catch-up overcharge detected",
      legitimate: "This bill looks genuine",
      unsupported: "Not supported yet",
    },
    // Keyed by the engine's diagnosis.messageKey. English mirrors diagnose.ts exactly (the engine remains
    // the source; this is used only to render the MR sibling — EN falls back to the engine string anyway).
    diagnosis: {
      unsupported: {
        summary: "This tool does not support your tariff category yet, so it cannot check this bill.",
        rationale:
          "The pro-rata overbilling check currently covers residential (LT-I-B) connections only. BPL and non-residential tariffs are out of scope for this version.",
      },
      smartCatchUp: {
        summary: "Your new meter appears to have billed accumulated units in one go (a catch-up bill).",
        rationale:
          "After a recent meter replacement, units that built up before the swap look like they were billed together, pushing you into higher telescopic slabs. Spread month-by-month, the lawful energy charge is lower — the difference is the estimated overcharge.",
      },
      smartGenuine: {
        summary: "This looks like a genuine bill from your new meter, not a catch-up overcharge.",
        rationale:
          "Even spread across the billing months, the energy charge does not fall — so the new meter's reading is not creating a slab-jump distortion.",
      },
      averageBilling: {
        summary: "Your bill was raised on an estimated/average reading, which has overcharged the energy component.",
        rationale:
          "Because the reading was estimated rather than actual, accumulated units were billed together and pushed into higher telescopic slabs. Billed month-by-month, the lawful energy charge is lower — the difference is the estimated overcharge.",
      },
      slabJump: {
        summary: "Units from several months appear billed in one cycle, pushing you into higher slabs (slab-jump).",
        rationale:
          "The billing period spans more than one cycle, so lumped units cross into higher telescopic slabs. Spread across the equivalent months, the lawful energy charge is lower — the difference is the estimated overcharge.",
      },
      accumNoBenefit: {
        summary: "Even spread across the billing months, this bill does not show a slab-jump overcharge.",
        rationale:
          "Pricing the units month-by-month gives the same energy charge as billed, so there is no telescopic-slab distortion to challenge.",
      },
      normal: {
        summary: "This looks like a normal, single-cycle bill on an actual meter reading.",
        rationale:
          "A roughly one-month period read from the meter has no accumulation to unwind — a high amount here reflects genuine usage, not a billing error, so there is nothing to escalate.",
      },
    },
    reassureTitle: "Your power will not be cut off",
    // {fair} and {overcharge} are pre-formatted rupee strings.
    payFair:
      "You get at least 15 days’ written notice before any disconnection. Pay the fair amount of {fair} under written protest — the rest ({overcharge}, the estimated overcharge) is what you are disputing. ",
    payNoFair:
      "You get at least 15 days’ written notice before any disconnection. Pay your bill minus the estimated overcharge of {overcharge} under written protest — dispute only that difference. ",
    paySection56:
      "Under the proviso to Section 56(1) of the Electricity Act, 2003, supply cannot be disconnected for an amount genuinely in dispute and deposited under protest.",
    unsupportedTitle: "This tariff isn't supported yet",
    outsideTitle: "Outside our verified tariff data",
    outsideBody:
      "This billing period falls outside the tariff data we have verified, so we cannot compute a reliable figure. Adig only shows numbers it can stand behind.",
    mismatchTitle: "Energy charge check",
    mismatchBody:
      "The energy charge you entered differs significantly from what the tariff slabs calculate for these units. Please double-check your bill's 'Energy Charges' line.",
    costLikely: "Likely overcharge",
    costOvercharge: "Overcharge",
    energyBilled: "Energy charge — as billed",
    energyLawful: "Energy charge — lawful pro-rata",
    energyEstimate: "Standard slab-rate estimate for your units",
    verifyScopeNote:
      "This checks only the energy-charge portion of your bill — not fixed charges, FAC, duty or tax.",
    verifyConfirm:
      "Your billed energy charge is at or below our standard-tariff estimate for these units, so there's no slab-jump overcharge to challenge.",
    verifyEstimateNote:
      "This is an estimate at MERC standard slab rates for your units. Small differences from your actual bill are normal — your bill also includes FAC, other adjustments and rounding that this check leaves out.",
    // The standard estimate caveat — mirrors ESTIMATE_CAVEAT in calculate.ts.
    estimateCaveat:
      "Estimated on the energy-charge component only, per the standard monthly pro-rata rule (MERC Supply Code 2021, Regulation 16.1.1). Fixed charges, duty and taxes are not included.",
    seeWorking: "See the full slab-by-slab working",
    hideWorking: "Hide the full slab-by-slab working",
    // {units}, {months}, {monthWord}, {perMonth} interpolated.
    workingSentence:
      "Your {units} units over {months} equivalent {monthWord} ≈ {perMonth} units/month, each month charged at the monthly slabs.",
    slabAsBilledTitle: "As billed — all units lumped into one period",
    slabLawfulTitle: "Lawful monthly-equivalent pro-rata (Reg. 16.1.1)",
    slabHeadSlab: "Slab (units)",
    slabHeadUnits: "Units",
    slabHeadRate: "₹/unit",
    slabHeadCharge: "Charge",
    slabSubtotal: "Subtotal (energy charge)",
    differenceOvercharge: "Difference = overcharge",
    monthSingular: "month",
    monthPlural: "months",
    partialTitle: "Figure covers only part of the period",
    // {label} interpolated.
    partialBody:
      "Part of this billing period is outside our verified tariff data, so the estimate above covers only the months we could price ({label}).",
    evidenceEyebrow: "Evidence",
    evidenceTitle: "Gather these before you file",
  },
  // Engine evidence-checklist overrides, keyed by the stable item id. label is required; description may
  // be "" when the item has none. Used only to render the MR sibling; EN falls back to the engine string.
  evidence: {
    "disputed-bill": { label: "The disputed bill", description: "" },
    "prior-bills": { label: "Previous 3 bills", description: "Shows your normal usage and any estimated runs." },
    "meter-photo": { label: "Current meter reading photo", description: "" },
    "meter-test-report": { label: "Meter test report (if meter suspected faulty)", description: "" },
  },
  documents: {
    eyebrow: "Document",
    title: "Generate your escalation letter",
    intro:
      "Tell us where you are stuck and we’ll assemble the correct instrument for that stage — the legal grounds and forum are fixed and checked against the regulations; only your own facts are filled in.",
    stageLabel: "Where are you stuck?",
    stageHelp: "This selects the next document in the escalation ladder.",
    stageNew: "I just got the bill",
    stageIcrs: "MSEDCL (ICRS) did not resolve it",
    stageCgrf: "CGRF rejected it / did not decide",
    descLabel: "In your own words (optional)",
    descPlaceholder:
      "Briefly describe what happened — when the bill arrived, how it compares with your usual bills, why you think it's wrong. Any language is fine.",
    descHelp:
      "We use this only to write the plain 'statement of facts' paragraph. It never changes the legal wording.",
    priorEyebrow: "One more thing",
    priorTitle: "Reference to the previous stage",
    priorRefNo: "Complaint / order reference number",
    priorDate: "Date of that complaint / order",
    priorOutcome: "What happened (e.g. no response, rejected)",
    priorRefHint: "Enter the previous stage's reference number above to generate your document.",
    preparingTitle: "Preparing your document…",
    preparingBody: "Writing the statement-of-facts paragraph and assembling the letter.",
    download: "Download (.txt)",
    copy: "Copy text",
    copied: "Copied ✓",
    copiedStatus: "Letter copied to your clipboard.",
    draftTitle: "Draft — confirm before sending",
    draftBody:
      "Some details in this document are not yet primary-source confirmed. Review every figure and the current forum contact before you send it.",
    next: "Where do I send it?",
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
    // Shown only in Marathi mode: the generated instrument stays English.
    englishDocNote:
      "The legal document is generated in English; the forums accept English applications.",
    // Just-in-time circle picker (spec D29): shown on the CGRF tier when no circle was chosen at intake.
    circlePickerTitle: "Which is your MSEDCL circle?",
    circlePickerHelp: "Select your circle to see the exact CGRF office and address for your area.",
    // "How to file, step by step" walkthrough (structure comes from routing.filingSteps; sentences here).
    filingHeading: "How to file — step by step",
    newTabNote:
      "The link opens the official site in a new tab — keep this Adig tab open so you can copy your letter.",
    copyLetter: "Copy my letter",
    letterCopied: "Copied ✓",
    letterCopiedStatus: "Letter copied — paste it into the complaint box.",
    downloadLetter: "Download my letter (.txt)",
    stepVerify: "Confirm this step on the official site — the online form can change.",
    filing: {
      icrs: {
        open: "Open the MSEDCL ICRS complaint page (it opens in a new tab).",
        openLink: "Open the MSEDCL ICRS complaint page",
        otp:
          "Enter your Consumer Number (printed on your bill) and click “Generate OTP”, then enter the OTP sent to your registered mobile and email.",
        paste:
          "Choose the billing-related complaint category and paste your complaint text into the description box.",
        attach: "Attach your evidence — the disputed bill and any supporting photos.",
        submit:
          "Submit, and note the ICRS Complaint ID shown on screen — you’ll need it if you escalate to the CGRF.",
      },
      cgrfGeneric: {
        find: "Find your Circle's CGRF and its address on the official MSEDCL list.",
        findLink: "Open the official MSEDCL CGRF list",
      },
      cgrf: {
        print: "Print your application (Schedule A) together with Annexure A — the slab-by-slab calculation.",
        enclose: "Enclose your evidence and a copy of your earlier ICRS complaint and its outcome.",
        address:
          "Address it to the CGRF shown above. If your Circle’s forum is not shown, confirm the correct office and address from the official MSEDCL CGRF list before sending.",
        send: "Submit in person or by registered post (you may also file by email or the CGRF web portal).",
        keep:
          "Keep the stamped acknowledgement or postal receipt and the complaint number — cite it if you go to the Ombudsman.",
      },
      ombudsman: {
        print: "Print your representation (Schedule B) together with Annexure A — the slab-by-slab calculation.",
        copies: "Prepare 3 copies of all documents (the Ombudsman requires three sets).",
        enclose: "Enclose a copy of the CGRF order and your earlier complaints.",
        send: "Submit in person or by post to the address shown above.",
        keep: "Keep the acknowledgement and a record of the date you submitted it.",
      },
      rti: {
        write:
          "Write a short RTI application naming the records you want (e.g. meter reading logs and any load-survey data).",
        address:
          "Address it to the Public Information Officer (PIO) of your MSEDCL sub-division / division — the office named on your bill.",
        fee:
          "Enclose the RTI fee. The fee and payment mode changed under the 2026 Rules — confirm the current amount before sending.",
        keep: "Send by post or in person and keep the receipt; the PIO must reply within 30 days.",
      },
    },
  },
  resume: {
    title: "Resume where you left off?",
    body: "We saved your progress on this device only. Nothing was sent to a server.",
    resume: "Resume",
    startFresh: "Start fresh",
  },
  beta: {
    // Shown as a dismissible banner when Marathi is active.
    bannerText:
      "Marathi is a beta, machine-drafted translation and is being reviewed. The English version is authoritative.",
    dismiss: "Dismiss",
  },
} as const;

/**
 * Shape of a complete strings table. Widens the `as const` literals back to `string` so a sibling
 * (`mr.ts`) with different *values* but identical *keys* satisfies it — a missing key is a compile error.
 */
type DeepWiden<T> = T extends string ? string : { [K in keyof T]: DeepWiden<T[K]> };
export type Strings = DeepWiden<typeof en>;

export default en;
