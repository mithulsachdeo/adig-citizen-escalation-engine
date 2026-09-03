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

// Official MSEDCL CGRF list — the authoritative source a citizen self-serves from when we can't name
// their Circle's forum (spec D29 §5). Stable landing page, not the (scanned) PDF.
export const CGRF_LIST_URL =
  "https://www.mahadiscom.in/en/consumer/consumer-grievances-redressal-forum/";

// Generic-fallback walkthrough: unlike the named forums, step 1 links the official list so an unmapped
// or "Not sure" citizen can find their forum + address, then follows the same print → send → keep flow.
const CGRF_GENERIC_FILING_STEPS: FilingStep[] = [
  {
    textKey: "guidance.filing.cgrfGeneric.find",
    link: { labelKey: "guidance.filing.cgrfGeneric.findLink", url: CGRF_LIST_URL },
    verifyAtSource: true,
  },
  { textKey: "guidance.filing.cgrf.print", letterAction: "download" },
  { textKey: "guidance.filing.cgrf.enclose" },
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

// ----- Tier 2: CGRF. Statewide (spec D29): all 11 official forums + a ~45-circle jurisdiction map,
// verbatim from the MSEDCL "CGRF Addresses (English), Feb 2024" list. Every address here was
// re-verified against the live official source (2026-09-03); Vasai's building line is the one point
// where a second source disagrees, so it carries the standing verify-at-source flag with extra reason.
// Contacts (phone/email) are OMITTED by decision — the address is enough to file and avoids re-verifying
// 11 emails under time pressure. All share the same channel/timeline/steps, so a factory removes the
// 11-way duplication. -----

function cgrf(forumName: string, address: string): Routing {
  return {
    forumName,
    channel: "In person, by post, by email, or via the CGRF web portal",
    address,
    slaText:
      "File within 2 years of the cause of action; the Forum issues its order within 60 working days.",
    verifyAtSource: true,
    filingSteps: CGRF_FILING_STEPS,
  };
}

export const CGRF_BHANDUP_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Bhandup)",
  "Vidhyut, Ground floor, L.B.S. Marg, Near Asian Paint, Bhandup, Mumbai-400078"
);
export const CGRF_KOLHAPUR_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Kolhapur)",
  "Administrative Building, Tarabai Park, Kolhapur-416003"
);
export const CGRF_NASHIK_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Nashik)",
  "Type II Quarter No.3, 1st floor, Vidyut Bhavan Premises, Bytco Point, Nashik Road-422101"
);
export const CGRF_CSN_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Chh. Sambhaji Nagar)",
  "Vidhyut Bhawan, Dr. Babasaheb Ambedkar Marg, Chhatrapati Sambhaji Nagar-431001"
);
export const CGRF_AMRAVATI_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Amravati)",
  "Vidyut Bhawan, Shivaji Nagar, Camp Area, Amravati-444603"
);
export const CGRF_PUNE_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Pune)",
  "925, Kasaba Peth, Administrative Building, 2nd floor, Pune-411011"
);
export const CGRF_NAGPUR_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Nagpur)",
  "Prakash Bhawan, Link Road, Gaddi Gudam, Sadar, Nagpur-440001"
);
export const CGRF_KALYAN_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Kalyan)",
  "Behind Tejashree Building, Jahangir Maidan, Karnik Road, Kalyan-421301"
);
export const CGRF_BARAMATI_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Baramati)",
  "URJA Bhavan, Bhigwan Road, Baramati-413102"
);
export const CGRF_AKOLA_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Akola)",
  "Vidyut Bhawan, Ratanlal Plot, Ground Floor, Durga Chowk, Akola-444005"
);
export const CGRF_VASAI_ROUTING = cgrf(
  "Consumer Grievance Redressal Forum, MSEDCL (Vasai)",
  // 2024-PDF value; a second (uncited/older) source says "Deepshree Building" — verify at source.
  "Bldg. No. 18, Flat No. 5, 2nd Floor, MSEB Colony, Navghar, Dist. Palghar, Vasai East-401202"
);

/**
 * Circle-agnostic fallback used when the circle is "Not sure / other", blank, or unmapped. Names NO
 * specific forum or address (that would be a guess); its walkthrough links the official CGRF list so
 * the citizen can find their forum + address (spec D29 §5).
 */
export const CGRF_GENERIC_ROUTING: Routing = {
  forumName: "Consumer Grievance Redressal Forum (CGRF) for your MSEDCL Circle",
  channel: "In person, by post, by email, or via the CGRF web portal",
  slaText:
    "File within 2 years of the cause of action; the Forum issues its order within 60 working days.",
  verifyAtSource: true,
  filingSteps: CGRF_GENERIC_FILING_STEPS,
};

/** A selectable MSEDCL circle and the CGRF that has jurisdiction over it. The one source both the
 *  intake dropdown and the routing map derive from (spec D29). Alphabetical by `label` for the dropdown. */
export interface CircleOption {
  /** Stored on the form + passed to the engine; matched via normalizeCircle. */
  value: string;
  /** Human-readable circle name (Latin script — proper nouns, kept untranslated for v1). */
  label: string;
  forum: Routing;
}

// 45 circles across the 11 forums, verbatim jurisdiction from the 2024 CGRF list.
export const CIRCLES: CircleOption[] = [
  { value: "Ahmednagar", label: "Ahmednagar", forum: CGRF_NASHIK_ROUTING },
  { value: "Akola", label: "Akola", forum: CGRF_AKOLA_ROUTING },
  { value: "Amravati", label: "Amravati", forum: CGRF_AMRAVATI_ROUTING },
  { value: "Baramati", label: "Baramati", forum: CGRF_BARAMATI_ROUTING },
  { value: "Beed", label: "Beed", forum: CGRF_CSN_ROUTING },
  { value: "Bhandara", label: "Bhandara", forum: CGRF_NAGPUR_ROUTING },
  { value: "Bhiwandi", label: "Bhiwandi", forum: CGRF_BHANDUP_ROUTING },
  { value: "Buldhana", label: "Buldhana", forum: CGRF_AKOLA_ROUTING },
  { value: "Chandrapur", label: "Chandrapur", forum: CGRF_NAGPUR_ROUTING },
  { value: "Chh. Sambhaji Nagar (R)", label: "Chh. Sambhaji Nagar (R)", forum: CGRF_CSN_ROUTING },
  { value: "Chh. Sambhaji Nagar (U)", label: "Chh. Sambhaji Nagar (U)", forum: CGRF_CSN_ROUTING },
  { value: "Dhule", label: "Dhule", forum: CGRF_NASHIK_ROUTING },
  { value: "Gadchiroli", label: "Gadchiroli", forum: CGRF_NAGPUR_ROUTING },
  { value: "Ganeshkhind", label: "Ganeshkhind", forum: CGRF_PUNE_ROUTING },
  { value: "Gondia", label: "Gondia", forum: CGRF_NAGPUR_ROUTING },
  { value: "Hingoli", label: "Hingoli", forum: CGRF_CSN_ROUTING },
  { value: "Jalgaon", label: "Jalgaon", forum: CGRF_NASHIK_ROUTING },
  { value: "Jalna", label: "Jalna", forum: CGRF_CSN_ROUTING },
  { value: "Kalyan-I", label: "Kalyan-I", forum: CGRF_KALYAN_ROUTING },
  { value: "Kalyan-II", label: "Kalyan-II", forum: CGRF_KALYAN_ROUTING },
  { value: "Kolhapur", label: "Kolhapur", forum: CGRF_KOLHAPUR_ROUTING },
  { value: "Latur", label: "Latur", forum: CGRF_CSN_ROUTING },
  { value: "Malegaon", label: "Malegaon", forum: CGRF_NASHIK_ROUTING },
  { value: "Nagpur (R)", label: "Nagpur (R)", forum: CGRF_NAGPUR_ROUTING },
  { value: "Nagpur (U)", label: "Nagpur (U)", forum: CGRF_NAGPUR_ROUTING },
  { value: "Nanded", label: "Nanded", forum: CGRF_CSN_ROUTING },
  { value: "Nandurbar", label: "Nandurbar", forum: CGRF_NASHIK_ROUTING },
  { value: "Nashik (U)", label: "Nashik (U)", forum: CGRF_NASHIK_ROUTING },
  { value: "Osmanabad", label: "Osmanabad", forum: CGRF_CSN_ROUTING },
  { value: "Palghar", label: "Palghar", forum: CGRF_VASAI_ROUTING },
  { value: "Parbhani", label: "Parbhani", forum: CGRF_CSN_ROUTING },
  { value: "Pen", label: "Pen", forum: CGRF_KALYAN_ROUTING },
  { value: "Pune (R)", label: "Pune (R)", forum: CGRF_PUNE_ROUTING },
  { value: "Rastapeth", label: "Rastapeth", forum: CGRF_PUNE_ROUTING },
  { value: "Ratnagiri", label: "Ratnagiri", forum: CGRF_KOLHAPUR_ROUTING },
  { value: "Sangli", label: "Sangli", forum: CGRF_KOLHAPUR_ROUTING },
  { value: "Satara", label: "Satara", forum: CGRF_BARAMATI_ROUTING },
  { value: "Sindhudurg", label: "Sindhudurg", forum: CGRF_KOLHAPUR_ROUTING },
  { value: "Solapur", label: "Solapur", forum: CGRF_BARAMATI_ROUTING },
  { value: "Thane", label: "Thane", forum: CGRF_BHANDUP_ROUTING },
  { value: "Vasai", label: "Vasai", forum: CGRF_VASAI_ROUTING },
  { value: "Vashi", label: "Vashi", forum: CGRF_BHANDUP_ROUTING },
  { value: "Wardha", label: "Wardha", forum: CGRF_NAGPUR_ROUTING },
  { value: "Washim", label: "Washim", forum: CGRF_AKOLA_ROUTING },
  { value: "Yavatmal", label: "Yavatmal", forum: CGRF_AMRAVATI_ROUTING },
];

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

// Derived from CIRCLES (single source of truth), keyed by normalized circle name so free-text or
// slightly-off input still matches ("Pune (R)"→"puner", "Rasta Peth"/"Rastapeth"→"rastapeth").
const CGRF_BY_CIRCLE: Record<string, Routing> = Object.fromEntries(
  CIRCLES.map((c) => [normalizeCircle(c.value), c.forum])
);

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
