// MSEDCL electricity vertical — spec SHELL (T2).
//
// This wires the generic `Vertical` shape (../../types) with MSEDCL data: intake fields, evidence
// checklist, and the three-rung escalation ladder (ICRS → CGRF Schedule A → Ombudsman Schedule B)
// plus RTI as an evidence sidecar (NOT a rung — spec D15). `diagnose`/`calculate` are stubs that
// throw until T3/T4 implement them, so the module compiles and the ladder data is testable now.
//
// SCOPE: `routing` is now filled from the verbatim routing module (../../routing, T8). `legalGrounds`
// stays `[]` here on purpose — the verbatim citations live on the instrument templates (T5,
// @/engine/instruments), which the UI resolves by instrument id; the ladder does not duplicate them.
// `tierTemplate` keeps its minimal T2 title/disclaimer for the same reason. Do not invent citations here.
//
// Confidence flags (from "Primary-source verification pass"):
//   ICRS mechanics/timelines ...... verified
//   CGRF Schedule A template+routing verified
//   Ombudsman Schedule B + routing . verified
//   RTI ........................... draft (form/fee: MH fee rose Rs10→Rs30 under 2026 Rules; routing model is verified)

import type {
  Vertical,
  Tier,
  Sidecar,
  IntakeField,
  EvidenceItem,
} from "../../types";
import { calculate } from "./calculate"; // T3: pro-rata overcharge engine
import { diagnose } from "./diagnose"; // T4: classification (slab-jump / average-billing / smart-meter / legitimate)
import {
  ICRS_ROUTING,
  CGRF_GENERIC_ROUTING,
  OMBUDSMAN_MUMBAI_ROUTING,
  RTI_ROUTING,
} from "../../routing"; // T8: verbatim routing (circle-specific CGRF resolved at render via getTierRouting)

// ----- Intake fields (spec story 1; rates are NOT asked — spec D12) -----

const intake: IntakeField[] = [
  { name: "unitsBilled", label: "Units billed (kWh)", type: "number", required: true },
  { name: "periodFrom", label: "Billing period — from", type: "date", required: true },
  { name: "periodTo", label: "Billing period — to", type: "date", required: true },
  { name: "amountBilled", label: "Amount billed (Rs)", type: "number", required: true },
  {
    name: "energyChargeBilled",
    label: "Energy charges shown on your bill (Rs)",
    type: "number",
    required: true,
    help: "Look for the 'Energy Charges' line item under billing details on your bill.",
  },
  {
    name: "readingType",
    label: "Reading type",
    type: "select",
    required: true,
    options: [
      { value: "actual", label: "Actual" },
      { value: "estimated", label: "Estimated / Average" },
    ],
    help: "On the bill, usually shown near the meter reading.",
  },
  {
    name: "category",
    label: "Consumer category",
    type: "select",
    required: true,
    options: [{ value: "LT-I-B-residential", label: "Residential (LT-I-B)" }],
  },
  {
    name: "circle",
    label: "MSEDCL circle / sub-division",
    type: "text",
    required: false,
    help: "From your bill — used to route your complaint to the correct forum.",
  },
  {
    name: "meterType",
    label: "Meter type",
    type: "select",
    required: false,
    options: [
      { value: "regular", label: "Regular" },
      { value: "smart", label: "Smart meter" },
    ],
  },
  { name: "priorMonthlyAvgUnits", label: "Prior monthly average units", type: "number", required: false },
  { name: "recentMeterSwap", label: "Meter recently replaced?", type: "boolean", required: false },
  {
    name: "declaredStage",
    label: "Where are you stuck?",
    type: "select",
    required: false,
    options: [
      { value: "new", label: "Just got the bill" },
      { value: "icrs_ignored", label: "MSEDCL (ICRS) did not resolve it" },
      { value: "cgrf_rejected", label: "CGRF rejected / did not decide" },
    ],
    help: "Selects the next document to generate.",
  },
];

// ----- Evidence checklist (spec story 3/4) -----

const evidenceChecklist: EvidenceItem[] = [
  { id: "disputed-bill", label: "The disputed bill", confidence: "verified" },
  { id: "prior-bills", label: "Previous 3 bills", description: "Shows your normal usage and any estimated runs.", confidence: "verified" },
  { id: "meter-photo", label: "Current meter reading photo", confidence: "verified" },
  { id: "meter-test-report", label: "Meter test report (if meter suspected faulty)", confidence: "verified" },
];

// ----- Escalation ladder (spec D15) — three rungs. Placeholders; T5/T8 fill legal content. -----

const SELF_HELP_DISCLAIMER =
  "This is a self-help draft. It is checked against the source regulations but is not legal advice; review before sending.";

const icrs: Tier = {
  order: 1,
  instrument: "icrs",
  instrumentName: "Internal complaint to MSEDCL (ICRS)",
  instrumentNameMr: "महावितरण अंतर्गत तक्रार (ICRS)", // MR: machine-drafted — pending native review
  stage: "new",
  requiresPriorTierRef: false,
  confidence: "verified",
  tierTemplate: {
    en: { title: "Internal complaint to MSEDCL (ICRS)", disclaimer: SELF_HELP_DISCLAIMER },
  },
  legalGrounds: [], // legal grounds live on the instrument templates (T5); routing is the T8 concern here
  routing: ICRS_ROUTING,
};

const cgrfScheduleA: Tier = {
  order: 2,
  instrument: "cgrf-schedule-a",
  instrumentName: "Application to CGRF (Schedule A)",
  instrumentNameMr: "ग्राहक तक्रार निवारण मंच (CGRF) कडे अर्ज (अनुसूची अ)", // MR: machine-drafted — pending native review
  stage: "icrs_ignored",
  requiresPriorTierRef: true, // must cite the prior ICRS complaint (spec story 10)
  confidence: "verified",
  tierTemplate: {
    en: { title: "Application to Forum for Redressal of Grievance (Schedule A)", disclaimer: SELF_HELP_DISCLAIMER },
  },
  legalGrounds: [],
  // Circle-agnostic default; GuidanceStep resolves the jurisdictional CGRF (Pune / Baramati) from the
  // citizen's circle via getTierRouting. An unknown circle keeps this generic routing (never a guess).
  routing: CGRF_GENERIC_ROUTING,
};

const ombudsmanScheduleB: Tier = {
  order: 3,
  instrument: "ombudsman-schedule-b",
  instrumentName: "Representation to Electricity Ombudsman (Schedule B)",
  instrumentNameMr: "विद्युत लोकपाल यांच्याकडे निवेदन (अनुसूची ब)", // MR: machine-drafted — pending native review
  stage: "cgrf_rejected",
  requiresPriorTierRef: true, // needs the CGRF order reference (spec story 10)
  confidence: "verified",
  tierTemplate: {
    en: { title: "Representation before the Electricity Ombudsman (Schedule B)", disclaimer: SELF_HELP_DISCLAIMER },
  },
  legalGrounds: [],
  routing: OMBUDSMAN_MUMBAI_ROUTING,
};

const escalationLadder: Tier[] = [icrs, cgrfScheduleA, ombudsmanScheduleB];

// ----- RTI evidence sidecar (NOT a ladder rung — spec D15). Ships `draft`: form/fee unconfirmed. -----

const rtiSidecar: Sidecar = {
  id: "rti",
  name: "RTI application for meter / reading logs",
  nameMr: "मीटर / रीडिंग नोंदींसाठी माहिती अधिकाराचा (RTI) अर्ज", // MR: machine-drafted — pending native review
  availableAtAnyTier: true,
  confidence: "draft", // routing model verified, but MH RTI fee (Rs10→Rs30, 2026 Rules) unconfirmed
  tierTemplate: {
    en: { title: "Application under the Right to Information Act, 2005", disclaimer: SELF_HELP_DISCLAIMER },
  },
  legalGrounds: [],
  routing: RTI_ROUTING,
};

// ----- Function slots — diagnose (T4) + calculate (T3) are now the real implementations -----

export const msedclElectricitySpec: Vertical = {
  id: "msedcl-electricity",
  name: "MSEDCL electricity overbilling",
  languages: ["en"], // v1 English only; the Language seam exists (spec D20)
  intake,
  diagnosis: diagnose,
  calculation: calculate,
  evidenceChecklist,
  escalationLadder,
  sidecars: [rtiSidecar],
};

export default msedclElectricitySpec;
