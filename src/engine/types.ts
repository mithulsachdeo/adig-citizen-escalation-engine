// Generic engine types for the Citizen Escalation Engine.
//
// Design intent (Engineering spec §"Implementation Decisions"): one config-driven
// `Vertical` spec drives the whole flow. Author one now (MSEDCL electricity), but keep
// the schema generic so a passport / CPGRAMS vertical — one with NO calculation step —
// slots in without touching these types. `calculation` is therefore optional/nullable,
// and `DiagnosisResult`/`CalculationResult` are shaped generically (the electricity
// vertical narrows `DiagnosisResult.classification` to its own set of codes in T3).
//
// Nothing here does I/O. The two test seams (spec §"Test seams") are the pure pipeline
// `runVertical` (T3+) and the `NarrativeGenerator` port (T5+); this file only defines the
// data those seams operate on.

// ----- Orthogonal config dimensions -----

/** Output/scaffolding language. v1 ships 'en' only; 'mr' is the built-but-unshipped seam (spec D20). */
export type Language = "en" | "mr";

/**
 * Trust level of a shipped item. `verified` = checked by us against the primary-source
 * regulation (NOT lawyer-confirmed — the self-help disclaimer shows regardless).
 * Mirrors the Badge component's `Confidence` (src/components/Badge.tsx).
 */
export type Confidence = "verified" | "draft";

/** A value that varies per language. v1 populates only `en`. */
export type PerLanguage<T> = Partial<Record<Language, T>>;

// ----- User input (collected once, at intake) -----

/** How the meter reading behind the bill was obtained. Drives diagnosis thresholds (spec D19). */
export type ReadingType = "actual" | "estimated";

export type MeterType = "regular" | "smart";

/** The prior tier's outcome, captured so the next instrument can cite it (spec D16, story 10). */
export interface PriorTierRef {
  /** Complaint / order reference number from the previous tier. */
  referenceNo: string;
  /** ISO date (YYYY-MM-DD) of the prior complaint or order. */
  date: string;
  /** What happened: e.g. "no response", "rejected", "partially allowed". */
  outcome?: string;
}

/**
 * Everything the citizen enters. Rates are NOT here — the tool owns the tariff config (spec D12).
 * Dates are ISO (YYYY-MM-DD). `category`/`circle`/`declaredStage` are strings so verticals define
 * their own value sets via `IntakeField.options`.
 */
export interface UserInput {
  unitsBilled: number;
  periodFrom: string;
  periodTo: string;
  amountBilled?: number;
  readingType: ReadingType;
  category: string;
  circle?: string;
  meterType?: MeterType;
  priorMonthlyAvgUnits?: number;
  recentMeterSwap?: boolean;
  /** Where the citizen is stuck; selects the ladder tier (spec D16). Matches a `Tier.stage`. */
  declaredStage?: string;
  priorTierRef?: PriorTierRef;
}

// ----- Diagnosis -----

/**
 * Output of the vertical's `diagnose`. Generic: `classification` is a vertical-defined code
 * (electricity uses e.g. 'slab_jump' | 'average_billing' | 'smart_meter_catch_up' | 'legitimate';
 * spec D19). `isActionable` false ⇒ honest "this bill looks genuine", no escalation offered.
 */
export interface DiagnosisResult {
  classification: string;
  isActionable: boolean;
  /** Plain-language explanation shown to the citizen. */
  summary: string;
  rationale?: string;
}

// ----- Calculation (optional per vertical) -----

/** One slab's contribution to the energy charge — used for both the "as billed" and "lawful" breakdowns. */
export interface SlabCharge {
  fromUnit: number;
  /** null = open-ended top slab. */
  toUnit: number | null;
  /** Units falling within this slab. */
  units: number;
  /** Energy-charge rate applied (Rs/unit). */
  rate: number;
  /** units * rate. */
  charge: number;
}

/**
 * Output of the vertical's `calculate` (spec D12/D14). Overcharge = actual − lawful on the
 * ENERGY-CHARGE component ONLY (wheeling/fixed/FAC/taxes excluded). It is an ESTIMATE citing
 * Supply Code 2021 Reg 16.1.1 — never a definitive legal figure (`estimateCaveat` carries that text).
 */
export interface CalculationResult {
  /** Energy charge as actually billed (lumped into one period). */
  actualEnergyCharge: number;
  /** Lawful monthly-equivalent pro-rata energy charge. */
  lawfulEnergyCharge: number;
  /** actualEnergyCharge − lawfulEnergyCharge. ≤ 0 ⇒ diagnosis should be `legitimate`. */
  overcharge: number;
  actualBreakdown: SlabCharge[];
  lawfulBreakdown: SlabCharge[];
  /** Which tariff version was applied, e.g. "FY2026-27" (spec: return the table label). */
  tableLabel: string;
  /** The "estimate based on standard pro-rata, per Reg 16.1.1" caveat (spec D14, story 7). */
  estimateCaveat: string;
  /** Equivalent months the period spans (accumulated units ÷ months). */
  monthsInPeriod?: number;
  /** True if part of the period predates the tariff coverage boundary and was not computed. */
  outsideVerifiedTariff?: boolean;
}

// ----- Function slots on the vertical spec (implemented in T3/T4) -----

export type DiagnoseFn = (input: UserInput) => DiagnosisResult;
export type CalculateFn = (input: UserInput) => CalculationResult;

// ----- Intake / evidence definitions -----

export type IntakeFieldType = "number" | "date" | "text" | "select" | "boolean";

/** Declarative intake field. `name` maps to a `UserInput` key. */
export interface IntakeField {
  name: keyof UserInput | string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  /** For `select` fields. */
  options?: { value: string; label: string }[];
  help?: string;
  /** e.g. mark a field whose value set is not yet primary-source-confirmed. */
  confidence?: Confidence;
}

/** An item of evidence the citizen should gather before escalating (spec story 3/4, "what evidence"). */
export interface EvidenceItem {
  id: string;
  label: string;
  description?: string;
  confidence: Confidence;
}

// ----- Legal scaffolding + routing (deterministic; VERBATIM from the verification file, filled in T5/T8) -----

/** A verified legal ground the tool asserts, with its exact primary-source clause. Never AI-invented (spec story 11). */
export interface LegalGround {
  /** The claim the tool makes. */
  claim: string;
  /** Exact primary-source citation, e.g. "Supply Code 2021, Reg 16.1.1 proviso". */
  citation: string;
  confidence: Confidence;
}

/** Where and how to submit an instrument (spec D18). Wrong-forum routing is a failure; unverified detail is omitted, not guessed. */
export interface Routing {
  /** Forum/office name, e.g. "Consumer Grievance Redressal Forum, MSEDCL (Pune)". */
  forumName: string;
  /** Submission channel, e.g. "wss.mahadiscom.in/ICRS/", "1912", "in person / post / email". */
  channel?: string;
  address?: string;
  contact?: string;
  /** Service-level / timeline text for this tier. */
  slaText?: string;
  /** Contact is volatile — pull live at runtime rather than trust the stored value (spec: CGRF phone/email). */
  verifyAtSource?: boolean;
}

/**
 * Deterministic instrument template for a tier, per language. The NarrativeGenerator fills ONLY
 * the facts paragraph (spec D10); everything here — title, scaffold, prayer, field-list — is fixed
 * data verified from the primary source. Placeholders now; T5/T8 populate.
 */
export interface TierTemplate {
  /** Instrument title, e.g. "Application to Forum for Redressal of Grievance (Schedule A)". */
  title: string;
  salutation?: string;
  /** Deterministic body scaffold with placeholders; the narrative slot fills the facts paragraph. */
  bodyScaffold?: string;
  /** Relief sought. For electricity this cites Electricity Act §62(6) (refund with interest). */
  prayer?: string;
  /** Exact form field-list the instrument must match (e.g. Schedule A items 1–8 + declaration). */
  fieldList?: string[];
  /** Self-help disclaimer — shows on every instrument regardless of confidence badge. */
  disclaimer?: string;
}

// ----- Escalation ladder -----

/**
 * One rung of the progressive-escalation ladder (spec D15). Rendered ready-to-submit when
 * `confidence` is 'verified', else marked "draft — confirm before sending" via the Badge.
 */
export interface Tier {
  order: number;
  /** Stable instrument id, e.g. 'icrs' | 'cgrf-schedule-a' | 'ombudsman-schedule-b'. */
  instrument: string;
  /** Display name for the instrument. */
  instrumentName: string;
  tierTemplate: PerLanguage<TierTemplate>;
  legalGrounds: LegalGround[];
  routing: Routing;
  /** True if this tier's instrument must cite the previous tier's reference/date/outcome (spec story 10). */
  requiresPriorTierRef: boolean;
  confidence: Confidence;
  /** The `UserInput.declaredStage` value that selects this tier (spec D16). */
  stage?: string;
}

/**
 * An evidence sidecar — available at ANY tier, not a ladder rung (spec D15: RTI is a sidecar,
 * used to pull meter/load-survey logs). Kept off `escalationLadder` so tier selection never lands on it.
 */
export interface Sidecar {
  id: string;
  name: string;
  availableAtAnyTier: boolean;
  tierTemplate?: PerLanguage<TierTemplate>;
  legalGrounds?: LegalGround[];
  routing?: Routing;
  confidence: Confidence;
}

// ----- The vertical spec -----

/**
 * A complete vertical: data + function references (spec §"Implementation Decisions").
 * `calculation` is optional/nullable so a diagnosis-only vertical (passport/CPGRAMS) fits with
 * `calculation: null`. `intake`/`diagnosis`/`calculation` run once; the ladder is the tier-level part.
 */
export interface Vertical {
  id: string;
  name: string;
  languages: Language[];
  intake: IntakeField[];
  diagnosis: DiagnoseFn;
  calculation?: CalculateFn | null;
  evidenceChecklist: EvidenceItem[];
  escalationLadder: Tier[];
  /** Non-rung helpers (e.g. RTI). Optional — a vertical may have none. */
  sidecars?: Sidecar[];
}

/**
 * Result of the primary pipeline seam `runVertical(spec, input)` (implemented T3+). Declared here so
 * the seam's shape is fixed engine-wide and every vertical returns the same envelope. `calculation`
 * is null for verticals with no calc step.
 */
export interface PipelineResult {
  diagnosis: DiagnosisResult;
  calculation: CalculationResult | null;
  evidence: EvidenceItem[];
  /** The selected ladder tier (from declared stage), or null if none applies. */
  tier: Tier | null;
  /** The instrument id of the selected tier. */
  instrument: string | null;
}
