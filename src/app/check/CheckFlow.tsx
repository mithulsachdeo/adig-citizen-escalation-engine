"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StepProgress } from "@/components/StepProgress";
import { runVertical } from "@/engine/runVertical";
import { msedclElectricitySpec } from "@/engine/verticals/msedcl-electricity/spec";
import { assembleInstrument, INSTRUMENT_TEMPLATES } from "@/engine/instruments";
import type { InstrumentFacts } from "@/engine/instruments";
import type { NarrativeInput } from "@/engine/narrative";
import { ApiNarrativeGenerator } from "./narrativeClient";
import {
  EMPTY_FORM,
  EMPTY_PRIOR_REF,
  SCREEN_STEP,
  STEP_LABELS,
  buildUserInput,
  validateIntake,
  type FormState,
  type PriorRefState,
  type Screen,
} from "./state";
import { formatBillPeriod, formatDateLong, todayISO } from "./format";
import { IntakeStep } from "./IntakeStep";
import { ResultsStep } from "./ResultsStep";
import { DocumentsStep } from "./DocumentsStep";
import { GuidanceStep } from "./GuidanceStep";

// Orchestrator for the intake → results → documents → guidance flow (T7). Owns all state; the pure
// engine (runVertical / assembleInstrument) is called client-side, and the only impure call — the
// narrative — goes through ApiNarrativeGenerator (which falls back offline). The tariff/rates are the
// engine's; nothing entered here is persisted (store-nothing).

const SCREEN_TITLE: Record<Screen, string> = {
  intake: "Check your bill",
  results: "What we found",
  documents: "Your escalation document",
  guidance: "How to submit",
};

export function CheckFlow() {
  const [screen, setScreen] = useState<Screen>("intake");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [stage, setStage] = useState<string>("new");
  const [priorRef, setPriorRef] = useState<PriorRefState>(EMPTY_PRIOR_REF);

  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const generatorRef = useRef<ApiNarrativeGenerator | null>(null);
  if (!generatorRef.current) generatorRef.current = new ApiNarrativeGenerator();

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // One pipeline pass drives every screen: diagnosis + calculation are stage-independent; the tier is
  // selected from `stage` (+ prior-tier ref) for the Documents / Guidance screens.
  const input = useMemo(() => buildUserInput(form, stage, priorRef), [form, stage, priorRef]);
  const result = useMemo(() => runVertical(msedclElectricitySpec, input), [input]);

  const billPeriod = formatBillPeriod(form.periodFrom, form.periodTo);

  const narrativeInput: NarrativeInput = useMemo(
    () => ({
      userDescription: form.userDescription.trim() || undefined,
      classification: result.diagnosis.classification,
      billPeriod: billPeriod || undefined,
      unitsBilled: input.unitsBilled || undefined,
      priorMonthlyAvgUnits: input.priorMonthlyAvgUnits,
      amountBilled: input.amountBilled,
      readingType: input.readingType,
      meterType: input.meterType,
    }),
    [form.userDescription, result.diagnosis.classification, billPeriod, input]
  );
  const narrativeSig = useMemo(() => JSON.stringify(narrativeInput), [narrativeInput]);

  // Fetch the caged narrative when the Documents screen is active for an actionable bill. Refetches
  // when the facts (signature) change; always resolves (offline fallback) so the letter never blocks.
  useEffect(() => {
    if (screen !== "documents" || !result.diagnosis.isActionable) return;
    let cancelled = false;
    const generator = generatorRef.current;
    if (!generator) return;
    setNarrativeLoading(true);
    generator.generate(narrativeInput).then((text) => {
      if (!cancelled) {
        setNarrative(text);
        setNarrativeLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // narrativeInput is captured; narrativeSig is the stable refetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, narrativeSig, result.diagnosis.isActionable]);

  const facts: InstrumentFacts = {
    date: formatDateLong(todayISO()),
    circle: input.circle,
    billPeriod: billPeriod || undefined,
    unitsBilled: input.unitsBilled || undefined,
    amountBilled: input.amountBilled,
    overchargeEstimate: result.calculation?.overcharge,
    priorTierRef: input.priorTierRef,
  };

  const template = result.instrument ? INSTRUMENT_TEMPLATES[result.instrument] : undefined;
  const assembled =
    template && narrative !== null ? assembleInstrument(template, facts, narrative) : null;

  // Scroll to the top of the flow whenever the screen changes (mobile: the tracker/title lead).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen]);

  function submitIntake() {
    const found = validateIntake(form);
    setErrors(found);
    if (Object.keys(found).length === 0) setScreen("results");
  }

  function restart() {
    setForm(EMPTY_FORM);
    setErrors({});
    setStage("new");
    setPriorRef(EMPTY_PRIOR_REF);
    setNarrative(null);
    setScreen("intake");
  }

  const rtiSidecar = msedclElectricitySpec.sidecars?.find((s) => s.id === "rti");

  return (
    <main className="adig-container" style={{ paddingBlock: "var(--space-5) var(--space-6)" }}>
      <div style={{ overflowX: "auto", paddingBottom: "var(--space-2)", marginBottom: "var(--space-5)" }}>
        <StepProgress steps={STEP_LABELS} current={SCREEN_STEP[screen]} />
      </div>

      <h1 style={{ font: "var(--text-h1)", marginBottom: "var(--space-5)" }}>{SCREEN_TITLE[screen]}</h1>

      {screen === "intake" && (
        <IntakeStep form={form} setField={setField} errors={errors} onSubmit={submitIntake} />
      )}

      {screen === "results" && (
        <ResultsStep
          result={result}
          amountBilled={input.amountBilled}
          onBack={() => setScreen("intake")}
          onNext={() => setScreen("documents")}
        />
      )}

      {screen === "documents" && (
        <DocumentsStep
          result={result}
          stage={stage}
          setStage={setStage}
          priorRef={priorRef}
          setPriorRef={setPriorRef}
          description={form.userDescription}
          setDescription={(v) => setField("userDescription", v)}
          assembled={assembled}
          narrativeLoading={narrativeLoading}
          onBack={() => setScreen("results")}
          onNext={() => setScreen("guidance")}
        />
      )}

      {screen === "guidance" && (
        <GuidanceStep
          result={result}
          rtiSidecar={rtiSidecar}
          onBack={() => setScreen("documents")}
          onRestart={restart}
        />
      )}
    </main>
  );
}

export default CheckFlow;
