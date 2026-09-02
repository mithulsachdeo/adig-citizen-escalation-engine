// Deterministic per-tier, per-language instrument templates (T5).
//
// Every legal string here is copied VERBATIM from the primary-source verification pass
// ("Primary-source verification pass — Electricity vertical" + "Evidence extract — verbatim clauses").
// NOTHING in this file is AI-invented: Act/section citations, forum names, SLAs/timelines, the
// prayer (Electricity Act §62(6)) and the pay-under-protest note (§56(1) proviso) are fixed data.
// The ONLY variable content an instrument carries is (a) the citizen's own facts, interpolated by
// `assembleInstrument`, and (b) the factual narrative paragraph — a HOLE the NarrativeGenerator fills.
// The narrative is never allowed to originate a citation; those live only in the constants below.
//
// Confidence (from the verification pass, §"Ships verified vs draft"):
//   ICRS mechanics/timelines + core grounds .... verified
//   CGRF Schedule A (form + timelines + routing) verified
//   Ombudsman Schedule B (form + timelines) .... verified
//   RTI ........................................ draft  (MH RTI fee rose Rs10 -> Rs30 under the 2026
//                                                        Rules; the PIO routing MODEL is verified but
//                                                        the form/fee is not — confirm before sending)

import type { Confidence, Language, PerLanguage } from "../types";

/**
 * A deterministic legal instrument template for one tier, in one language. Every field except
 * `subject`/`headerScaffold`/`prayer` (which carry `{{fact}}` placeholders for the citizen's own
 * data) is a verbatim fixed string. `assembleInstrument` composes these in a fixed order and drops
 * the narrative into its own section — it can never inject text into `legalBasis`, `slaText`, or the
 * citation half of `prayer`.
 */
export interface InstrumentTemplate {
  /** Stable instrument id — matches `Tier.instrument` / `Sidecar.id`. */
  instrument: string;
  title: string;
  confidence: Confidence;
  /** Verbatim forum/office this instrument is addressed to. Never fact- or narrative-derived. */
  forum: string;
  salutation: string;
  /** Subject line; may interpolate the citizen's facts (e.g. the billing period). */
  subject: string;
  /** "From / consumer particulars" block; interpolates the citizen's facts. */
  headerScaffold: string;
  /** Verbatim primary-source citations backing the claim. Template-only — never from the narrative. */
  legalBasis: string[];
  /** Verbatim timeline/SLA for this tier. */
  slaText: string;
  /** Relief sought. Citation text (Electricity Act §62(6)) is verbatim; only the rupee amount interpolates. */
  prayer: string;
  /** Verbatim pay-under-protest note citing the Electricity Act §56(1) proviso. */
  payUnderProtest?: string;
  /** Exact prescribed form field-list (Schedule A / Schedule B), verbatim. */
  fieldList?: string[];
  /** Extra "draft — confirm before sending" detail (e.g. the unconfirmed RTI fee). */
  draftNote?: string;
  /** Self-help disclaimer — rendered on EVERY instrument regardless of the confidence badge. */
  disclaimer: string;
}

// ----- Self-help disclaimer (shows on every instrument, verified or draft — verification pass §"Confidence") -----

export const SELF_HELP_DISCLAIMER =
  "This is a self-help draft prepared from your own inputs. It has been checked against the source " +
  "regulations but is not legal advice, and using it does not create any lawyer-client relationship. " +
  "Review every detail and confirm the current forum contact before you send it. Note: at the CGRF " +
  "and the Electricity Ombudsman an Advocate cannot appear as your representative (MERC CGRF & EO " +
  "Regulations, 2020) — a lawyer may help you draft, but you present the matter yourself.";

// ----- Verbatim legal citations (Evidence extract — verbatim clauses). Shared across templates. -----

/** Pro-rata slab anchor — the calc engine's lawful figure rests on this. */
const REG_16_1_1 =
  'MERC (Electricity Supply Code and Standards of Performance and Power Quality) Regulations, 2021, ' +
  'Regulation 16.1.1 proviso: "Provided that the period of billing shall be factored in on monthly ' +
  'basis so as to arrive at the proper consumption slab."';

/** Refund-with-interest hook — the basis for the prayer. */
const EA_62_6 =
  "Electricity Act, 2003, Section 62(6): where a licensee recovers a price or charge exceeding the " +
  "tariff determined under Section 62, the excess amount is recoverable by the person who has paid it, " +
  "with interest at the bank rate.";

/** Pay-under-protest / no-disconnection basis. */
const EA_56_1 =
  "Electricity Act, 2003, Section 56(1) proviso: the supply shall not be disconnected where the " +
  "consumer deposits, under protest, the disputed amount pending the dispute.";

/** Cap on estimated bills — strongest ground for the catch-up-bill scenario. */
const REG_16_3_6 =
  "MERC Supply Code 2021, Regulation 16.3.6: estimated billing shall not extend to more than two (2) " +
  "billing cycles at a stretch, and not more than two (2) estimated bills shall be generated for a " +
  "consumer during one (1) financial year.";

/** Unread-meter estimate method. */
const REG_16_3_5 =
  "MERC Supply Code 2021, Regulation 16.3.5: an estimated bill shall be computed on the consumption in " +
  "the corresponding period of the previous year, or the average of the previous three (3) billing " +
  "cycles for which the meter was read, whichever is higher.";

/** Bill-complaint standard of performance + automatic compensation for delay. */
const SOP_ITEM_5 =
  "MERC Supply Code 2021, Standards of Performance schedule, item 5 (Complaints on Consumer's Bills): " +
  "the complaint is to be acknowledged immediately (in person / by phone) or within 7 days (by post), " +
  "resolved within the subsequent billing cycle, with automatic compensation of Rs 100 per week of " +
  "delay, subject to a maximum of Rs 250.";

// ----- Reusable scaffold fragments -----

const CONSUMER_PARTICULARS =
  "{{consumerName}}\n" +
  "{{consumerAddress}}\n" +
  "Consumer No.: {{consumerNo}}\n" +
  "Nature of connection: {{connectionNature}}\n" +
  "Distribution Licensee: {{licensee}}\n" +
  "Circle / sub-division: {{circle}}\n" +
  "Billing period in dispute: {{billPeriod}}\n" +
  "Units billed: {{unitsBilled}}    Amount billed: Rs {{amountBilled}}";

const PAY_UNDER_PROTEST_NOTE =
  "If any part of the disputed bill is pressed for payment, I intend to pay it under protest. " +
  "Under the proviso to Section 56(1) of the Electricity Act, 2003, the supply cannot be disconnected " +
  "for non-payment of an amount that is genuinely in dispute and has been deposited under protest " +
  "pending resolution.";

/** Prayer body shared by ICRS / CGRF / Ombudsman — cites the Electricity Act §62(6) verbatim; only the amount interpolates. */
const PRAYER_REFUND =
  "I request that the disputed bill be revised to the lawful monthly pro-rata energy charge required " +
  "by Regulation 16.1.1 of the MERC Supply Code, 2021, that the amount recovered in excess (estimated " +
  "at approximately Rs {{overchargeEstimate}} on the energy-charge component) be refunded to me with " +
  "interest at the bank rate as provided by Section 62(6) of the Electricity Act, 2003, and that such " +
  "further relief as is just be granted.";

// ===== ICRS — tier 1 (verified) =====

const icrsEn: InstrumentTemplate = {
  instrument: "icrs",
  title: "Internal complaint to MSEDCL (ICRS)",
  confidence: "verified",
  forum:
    "The Executive Engineer / Nodal Officer,\n" +
    "MSEDCL Division Office — Internal Complaint Redressal System (ICRS)\n" +
    "(portal: wss.mahadiscom.in/ICRS/ · toll-free 1912 · or the division office named on your bill)",
  salutation: "Respected Sir/Madam,",
  subject: "Dispute of the electricity bill for the period {{billPeriod}} — request for correction and refund",
  headerScaffold: CONSUMER_PARTICULARS,
  legalBasis: [REG_16_1_1, REG_16_3_6, REG_16_3_5, EA_62_6, SOP_ITEM_5],
  slaText:
    "Under the MERC Supply Code, 2021, a billing complaint registered through the ICRS is to be " +
    "resolved within 15 working days (3 working days for supply / connection / disconnection matters).",
  prayer: PRAYER_REFUND,
  payUnderProtest: PAY_UNDER_PROTEST_NOTE,
  disclaimer: SELF_HELP_DISCLAIMER,
};

// ===== CGRF — tier 2, Schedule A (verified) =====

const cgrfScheduleAEn: InstrumentTemplate = {
  instrument: "cgrf-schedule-a",
  title: "Application to the Forum for Redressal of Grievance (Schedule A)",
  confidence: "verified",
  forum:
    "The Consumer Grievance Redressal Forum (CGRF), MSEDCL\n" +
    "(the jurisdictional Forum for your Circle — confirm the current address and contact from the " +
    "live MSEDCL CGRF list before sending)",
  salutation: "To the Consumer Grievance Redressal Forum,",
  subject: "Grievance regarding the electricity bill for the period {{billPeriod}}, unresolved at the ICRS stage",
  headerScaffold: CONSUMER_PARTICULARS,
  legalBasis: [REG_16_1_1, REG_16_3_6, REG_16_3_5, EA_62_6, SOP_ITEM_5],
  slaText:
    "This grievance is filed within two (2) years of the date on which the cause of action arose. The " +
    "Forum is required to pass its order within 60 working days (15 working days for non-supply matters). " +
    "The grievance may be filed in person, by post, by email or on the web.",
  prayer: PRAYER_REFUND,
  payUnderProtest: PAY_UNDER_PROTEST_NOTE,
  // Verbatim Schedule A field-list (verification pass §"Verified form field-lists").
  fieldList: [
    "Date",
    "1. Name of consumer",
    "2. Full address, with PIN / phone / fax / email",
    "3. Particulars of connection and consumer number (nature of connection)",
    "4. Name of the Distribution Licensee",
    "5. Details of the grievance / facts",
    "6. Nature of relief sought",
    "7. List of documents enclosed",
    "8. Declaration: (a) the statements are true and correct; (b) nothing material has been concealed; " +
      "(c) the grievance has never been submitted to the Forum before; (d) the matter is not settled or " +
      "decided by any other competent authority",
    "Signature (in block letters)",
    "Optional: Nomination of a representative (who is not an Advocate)",
  ],
  disclaimer: SELF_HELP_DISCLAIMER,
};

// ===== Ombudsman — tier 3, Schedule B (verified) =====

const ombudsmanScheduleBEn: InstrumentTemplate = {
  instrument: "ombudsman-schedule-b",
  title: "Representation before the Electricity Ombudsman (Schedule B)",
  confidence: "verified",
  forum:
    "The Electricity Ombudsman (Mumbai)\n" +
    "606-608, 6th Floor, Keshava Building, Bandra Kurla Complex, Bandra (East), Mumbai-400051\n" +
    "(Pune district is under the Mumbai Ombudsman per the MERC notification dated 27 March 2026 — " +
    "re-confirm the current postal address before sending)",
  salutation: "To the Electricity Ombudsman,",
  subject: "Representation against the order of the Consumer Grievance Redressal Forum in the matter of the electricity bill for {{billPeriod}}",
  headerScaffold: CONSUMER_PARTICULARS,
  legalBasis: [REG_16_1_1, REG_16_3_6, EA_62_6],
  slaText:
    "This representation is made within 60 days of the Forum's order, as required by the MERC (CGRF & " +
    "Electricity Ombudsman) Regulations, 2020. Three (3) copies of all documents are enclosed. After the " +
    "Ombudsman, the only further remedy is a writ petition before the High Court.",
  prayer: PRAYER_REFUND,
  payUnderProtest: PAY_UNDER_PROTEST_NOTE,
  // Verbatim Schedule B field-list (verification pass §"Verified form field-lists").
  fieldList: [
    "No. / year and date (office use)",
    "To: The Electricity Ombudsman",
    "Subject: the Forum order being represented against",
    "1. Name of consumer",
    "2. Full address, with PIN / phone / fax / email",
    "3. Name and address of the Distribution Licensee",
    "4. Name and address of the Forum",
    "5. Particulars of connection and consumer number",
    "6. Date the grievance was submitted to the Forum (enclose 3 copies)",
    "7. Subject matter",
    "8. Details / facts of the representation",
    "9. Whether the final decision of the Forum has been received (enclose a copy)",
    "10. Relief sought (enclose 3 copies of proof)",
    "11. Monetary loss / compensation claimed: Rs ____",
    "12. List of documents (3 copies)",
    "13. Declaration",
  ],
  disclaimer: SELF_HELP_DISCLAIMER,
};

// ===== RTI — evidence sidecar (DRAFT: form/fee unconfirmed; PIO routing model is verified) =====

const rtiEn: InstrumentTemplate = {
  instrument: "rti",
  title: "Application under the Right to Information Act, 2005",
  confidence: "draft",
  forum:
    "The Public Information Officer (PIO),\n" +
    "MSEDCL sub-division / division office named on your bill\n" +
    "(if unsure, the Executive Engineer, Chief Engineer Office, Pune Zone, Administrative Building, " +
    "Rastapeth, Pune-411011)",
  salutation: "Respected Public Information Officer,",
  subject: "Request for meter, reading and load-survey records for consumer no. {{consumerNo}}",
  headerScaffold: CONSUMER_PARTICULARS,
  legalBasis: [
    "Right to Information Act, 2005: the Public Information Officer must furnish the information within " +
      "30 days of the application; a First Appeal lies to the First Appellate Authority within 30 days " +
      "of the reply or of the expiry of that period.",
  ],
  slaText:
    "The PIO must reply within 30 days. If the reply is unsatisfactory or absent, a First Appeal lies to " +
    "the First Appellate Authority (FAA) within 30 days.",
  // Information sought — plain evidence request, not a legal citation.
  prayer:
    "Please provide, for consumer no. {{consumerNo}} and the billing period {{billPeriod}}: (1) the " +
    "meter reading register / reading history; (2) the dates on which readings were actually taken versus " +
    "estimated; (3) the meter testing report, if any; and (4) the load-survey / consumption data recorded " +
    "for the meter, together with certified copies of the relevant records.",
  draftNote:
    "DRAFT — confirm before sending. The Maharashtra RTI application fee rose from Rs 10 to Rs 30 under " +
    "the 2026 Rules; confirm the exact current fee and the accepted mode of payment (court-fee stamp / " +
    "DD / cash) before you file. The office that holds these records is the PIO named on your bill — " +
    "verify it; the routing model is checked but the fee and form are not yet.",
  disclaimer: SELF_HELP_DISCLAIMER,
};

/**
 * All instrument templates, keyed by instrument id then language. v1 populates `en` only; the `mr`
 * slot is left empty as the i18n seam (spec D20 — English is the forum-safe document language until a
 * language's scaffolding is separately verified).
 */
export const INSTRUMENT_TEMPLATES: Record<string, PerLanguage<InstrumentTemplate>> = {
  icrs: { en: icrsEn },
  "cgrf-schedule-a": { en: cgrfScheduleAEn },
  "ombudsman-schedule-b": { en: ombudsmanScheduleBEn },
  rti: { en: rtiEn },
};

/** Resolve one instrument's template for a language, falling back to English (the verified document language). */
export function getInstrumentTemplate(
  instrument: string,
  lang: Language = "en"
): InstrumentTemplate | undefined {
  const byLang = INSTRUMENT_TEMPLATES[instrument];
  if (!byLang) return undefined;
  return byLang[lang] ?? byLang.en;
}
