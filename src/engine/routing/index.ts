// Deterministic routing for the MSEDCL electricity ladder (spec D18; ticket T8).
//
// Every forum name, channel, address and timeline here is VERBATIM from the
// "Primary-source verification pass" — never AI-invented. Wrong-forum routing is a failure,
// so anything volatile or unconfirmed is OMITTED (left undefined) rather than guessed:
//   - CGRF-Pune phone/email — two official MSEDCL lists disagree (Feb-2024 vs Oct-2021) → contact omitted,
//     verifyAtSource=true (pull live from the CGRF portal).
//   - RTI fee — rose Rs10→Rs30 under the 2026 Rules and is unconfirmed → no rupee figure asserted (draft).
//
// Circle → CGRF resolution is the one input-dependent piece: a Pune-city circle
// (Ganeshkhind / Rastapeth / Pune (R)) routes to CGRF Pune; Baramati circle → CGRF Baramati.
// An unknown/blank circle returns `undefined` (fail cleanly) — the caller then shows the
// circle-agnostic CGRF_GENERIC_ROUTING that tells the citizen to confirm their Circle's Forum.
//
// The stable forum offices (ICRS division, Ombudsman Mumbai, RTI PIO) are constants below and are
// wired onto the ladder tiers in spec.ts, so Tier.routing is a single source of truth.

import type { Routing, FilingStep } from "../types";

// ----- "How to file" walkthroughs. Structure (order, link, letter action, verify-flag) is here;
// the sentences live in the i18n table under each `textKey`. Only ICRS is online: its deep link was
// confirmed against the LIVE portal (RegisterComplaint.aspx loads; Consumer-No → Generate-OTP is the
// real first step; everything past the OTP wall is flagged, not asserted). Offline forums carry NO
// link (inventing a portal URL would be a guess) and DOWNLOAD the letter for printing instead. -----

const ICRS_FILING_STEPS: FilingStep[] = [
  {
    textKey: "guidance.filing.icrs.open",
    link: {
      labelKey: "guidance.filing.icrs.openLink",
      url: "https://wss.mahadiscom.in/ICRS/RegisterComplaint.aspx?Lang=en-US",
    },
  },
  { textKey: "guidance.filing.icrs.otp" }, // Consumer No → Generate OTP — verified live
  { textKey: "guidance.filing.icrs.paste", letterAction: "copy", verifyAtSource: true },
  { textKey: "guidance.filing.icrs.attach", verifyAtSource: true },
  { textKey: "guidance.filing.icrs.submit", verifyAtSource: true },
];

// Shared by all CGRF routings; the specific office/address is shown in the card above (or, for the
// generic fallback, is itself verify-at-source), so step 3 points the citizen back to it.
const CGRF_FILING_STEPS: FilingStep[] = [
  { textKey: "guidance.filing.cgrf.print", letterAction: "download" },
  { textKey: "guidance.filing.cgrf.enclose" },
  { textKey: "guidance.filing.cgrf.address", verifyAtSource: true },
  { textKey: "guidance.filing.cgrf.send" },
  { textKey: "guidance.filing.cgrf.keep" },
];

const OMBUDSMAN_FILING_STEPS: FilingStep[] = [
  { textKey: "guidance.filing.ombudsman.print", letterAction: "download" },
  { textKey: "guidance.filing.ombudsman.copies" }, // "3 copies" — verified from the routing channel
  { textKey: "guidance.filing.ombudsman.enclose" },
  { textKey: "guidance.filing.ombudsman.send" },
  { textKey: "guidance.filing.ombudsman.keep" },
];

// The RTI sidecar has no generated instrument in this flow, so no copy/download letter action.
const RTI_FILING_STEPS: FilingStep[] = [
  { textKey: "guidance.filing.rti.write" },
  { textKey: "guidance.filing.rti.address" },
  { textKey: "guidance.filing.rti.fee", verifyAtSource: true }, // fee changed under the 2026 Rules
  { textKey: "guidance.filing.rti.keep" },
];

// ----- Tier 1: ICRS (division office). Mechanics/timelines verified; live URL = verify-at-source. -----

export const ICRS_ROUTING: Routing = {
  forumName: "MSEDCL division office — Internal Complaint Redressal System (ICRS)",
  channel:
    "Online at wss.mahadiscom.in/ICRS/, toll-free 1912, by SMS/mobile app, or in person at your division office",
  slaText:
    "Resolution within 15 working days for billing complaints (3 working days for supply/connection matters).",
  verifyAtSource: true, // confirm the live ICRS portal path / whether a written division complaint is still accepted
  filingSteps: ICRS_FILING_STEPS,
};

// ----- Tier 2: CGRF. Address stable across both official lists; phone/email conflict → omitted. -----

export const CGRF_PUNE_ROUTING: Routing = {
  forumName: "Consumer Grievance Redressal Forum, MSEDCL (Pune)",
  channel: "In person, by post, by email, or via the CGRF web portal",
  address: "925, Kasaba Peth, Administrative Building, 2nd floor, Pune-411011",
  slaText:
    "File within 2 years of the cause of action; the Forum issues its order within 60 working days.",
  // contact intentionally omitted — Feb-2024 and Oct-2021 MSEDCL lists give different phone/email.
  verifyAtSource: true,
  filingSteps: CGRF_FILING_STEPS,
};

export const CGRF_BARAMATI_ROUTING: Routing = {
  forumName: "Consumer Grievance Redressal Forum, MSEDCL (Baramati)",
  channel: "In person, by post, by email, or via the CGRF web portal",
  address: "URJA Bhavan, Bhigwan Road, Baramati-413102",
  slaText:
    "File within 2 years of the cause of action; the Forum issues its order within 60 working days.",
  verifyAtSource: true,
  filingSteps: CGRF_FILING_STEPS,
};

/**
 * Circle-agnostic fallback used when the circle is unknown/blank. Names NO specific forum or address
 * (that would be a guess); instead it directs the citizen to their Circle's Forum on the live list.
 */
export const CGRF_GENERIC_ROUTING: Routing = {
  forumName: "Consumer Grievance Redressal Forum (CGRF) for your MSEDCL Circle",
  channel: "In person, by post, by email, or via the CGRF web portal",
  slaText:
    "File within 2 years of the cause of action; the Forum issues its order within 60 working days.",
  // Post the 2024 amendment there is one Forum per distribution Circle; the correct Forum + address
  // must be read from the live MSEDCL CGRF list.
  verifyAtSource: true,
  filingSteps: CGRF_FILING_STEPS,
};

// ----- Tier 3: Ombudsman. Pune → Mumbai per the CURRENT 27 Mar 2026 notification. -----

export const OMBUDSMAN_MUMBAI_ROUTING: Routing = {
  forumName: "Electricity Ombudsman (Mumbai)",
  channel: "By post or in person; enclose 3 copies of all documents",
  address:
    "606–608, 6th Floor, Keshava Building, Bandra Kurla Complex, Bandra (East), Mumbai-400051",
  contact: "022-26592965 / 022-30680528 · electricityombudsmanmumbai@gmail.com",
  slaText:
    "Represent within 60 days of the CGRF order — only if the CGRF rejected it, did not decide in time, or caused undue delay.",
  verifyAtSource: true, // re-confirm the postal address (2020 Annexure B value)
  filingSteps: OMBUDSMAN_FILING_STEPS,
};

// ----- RTI evidence sidecar. Routing model verified; fee is draft → no rupee figure asserted. -----

export const RTI_ROUTING: Routing = {
  forumName:
    "Public Information Officer (PIO) of your own MSEDCL sub-division / division — the office named on your bill",
  channel: "By post or in person to the division PIO under the Right to Information Act, 2005",
  contact:
    "Zone fallback: Executive Engineer, Chief Engineer Office, Pune Zone, Administrative Building, Rastapeth, Pune-411011 · cepuneurban@mahadiscom.in / seganeshkhind@mahadiscom.in · 020-26061389",
  slaText:
    "The PIO replies within 30 days; a First Appeal lies to the FAA within 30 days. Note: the RTI fee changed under the 2026 Rules — confirm the current fee and payment mode before sending.",
  verifyAtSource: true,
  filingSteps: RTI_FILING_STEPS,
};

// ----- Circle → CGRF map -----

/** Normalize a circle string for matching: lowercase, strip everything but letters/digits. */
function normalizeCircle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Keyed by normalized circle name. "Pune (R)"→"puner", "Rasta Peth"/"Rastapeth"→"rastapeth".
const CGRF_BY_CIRCLE: Record<string, Routing> = {
  puner: CGRF_PUNE_ROUTING, // Pune (R)
  ganeshkhind: CGRF_PUNE_ROUTING,
  rastapeth: CGRF_PUNE_ROUTING,
  baramati: CGRF_BARAMATI_ROUTING,
};

/**
 * Resolve the jurisdictional CGRF for a circle. Returns `undefined` for an unknown or blank circle —
 * the caller must NOT guess a forum (wrong-forum routing is a failure); show CGRF_GENERIC_ROUTING instead.
 */
export function resolveCgrfRouting(circle?: string): Routing | undefined {
  if (!circle) return undefined;
  const key = normalizeCircle(circle);
  if (key.length === 0) return undefined;
  return CGRF_BY_CIRCLE[key];
}

/**
 * The routing for a ladder instrument. Circle only affects the CGRF tier; for an unknown circle the
 * CGRF tier falls back to the circle-agnostic generic routing (never a wrong-forum guess).
 * Returns `undefined` for an unknown instrument id.
 */
export function getTierRouting(instrument: string, circle?: string): Routing | undefined {
  switch (instrument) {
    case "icrs":
      return ICRS_ROUTING;
    case "cgrf-schedule-a":
      return resolveCgrfRouting(circle) ?? CGRF_GENERIC_ROUTING;
    case "ombudsman-schedule-b":
      return OMBUDSMAN_MUMBAI_ROUTING;
    case "rti":
      return RTI_ROUTING;
    default:
      return undefined;
  }
}
