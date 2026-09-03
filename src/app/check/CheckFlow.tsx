"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StepProgress } from "@/components/StepProgress";
import { runVertical } from "@/engine/runVertical";
import { msedclElectricitySpec } from "@/engine/verticals/msedcl-electricity/spec";
import { assembleInstrument, INSTRUMENT_TEMPLATES, formatOverchargeAnnexure } from "@/engine/instruments";
import type { InstrumentFacts } from "@/engine/instruments";
import type { NarrativeInput } from "@/engine/narrative";
import { ApiNarrativeGenerator } from "./narrativeClient";
import {
  EMPTY_FORM,
  EMPTY_PRIOR_REF,
  SCREEN_STEP,
  buildUserInput,
  validateIntake,
  type FormState,
  type PriorRefState,
  type Screen,
} from "./state";
import { formatBillPeriod, formatDateLong, todayISO } from "./format";
import { loadProgress, saveProgress, clearProgress } from "./storage";
import { IntakeStep } from "./IntakeStep";
import { ResultsStep } from "./ResultsStep";
import { DocumentsStep } from "./DocumentsStep";
import { GuidanceStep } from "./GuidanceStep";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { useT } from "@/i18n/context";
import { analytics } from "@/lib/analytics";

// Orchestrator for the intake → results → documents → guidance flow (T7). Owns all state; the pure
// engine (runVertical / assembleInstrument) is called client-side, and the only impure call — the
// narrative — goes through ApiNarrativeGenerator (which falls back offline). The tariff/rates are the
// engine's; nothing entered here is persisted (store-nothing).

// Progress-tracker step keys → i18n `progress.*` (labels toggle with the UI language).
const STEP_KEYS = ["diagnose", "calculate", "evidence", "document", "submit"] as const;

export function CheckFlow() {
  const t = useT();
  const stepLabels = STEP_KEYS.map((k) => t(`progress.${k}`));
  const [screen, setScreen] = useState<Screen>("intake");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [stage, setStage] = useState<string>("new");
  const [priorRef, setPriorRef] = useState<PriorRefState>(EMPTY_PRIOR_REF);

  // Optional device-local resume (store-nothing on server). We load any saved progress AFTER mount
  // (never during render — avoids an SSR/hydration mismatch) and offer it as an opt-in banner rather
  // than silently overwriting the fresh form. Auto-save is gated until the citizen resolves the banner.
  const [resumable, setResumable] = useState<ReturnType<typeof loadProgress>>(null);
  const bootstrapped = useRef(false);

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

  // Deterministic calculation annexure — only when a real overcharge was computed (not
  // unsupported / outside-coverage). It carries the slab-by-slab working into the letter (Annexure A).
  const calc = result.calculation;
  const overchargeAnnexure =
    calc && calc.overcharge > 0 && !calc.unsupported && calc.tableLabel !== "outside verified tariff data"
      ? formatOverchargeAnnexure(calc)
      : undefined;

  const facts: InstrumentFacts = {
    date: formatDateLong(todayISO()),
    circle: input.circle,
    billPeriod: billPeriod || undefined,
    unitsBilled: input.unitsBilled || undefined,
    amountBilled: input.amountBilled,
    overchargeEstimate: result.calculation?.overcharge,
    overchargeAnnexure,
    // Display-only hedge (kept on-screen with the annexure, stripped from the submission copy).
    overchargeCaveat: overchargeAnnexure ? calc?.estimateCaveat : undefined,
    priorTierRef: input.priorTierRef,
  };

  const template = result.instrument ? INSTRUMENT_TEMPLATES[result.instrument] : undefined;
  const assembled =
    template && narrative !== null ? assembleInstrument(template, facts, narrative) : null;

  // Scroll to the top of the flow whenever the screen changes (mobile: the tracker/title lead).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen]);

  // Zero-PII analytics for the later stages. instrument_generated fires once per assembled tier;
  // guidance_viewed fires when the submit screen is shown. Both carry only the instrument id.
  const instrumentFired = useRef<string | null>(null);
  useEffect(() => {
    if (screen === "documents" && assembled && instrumentFired.current !== assembled.instrument) {
      instrumentFired.current = assembled.instrument;
      analytics.instrumentGenerated(assembled.instrument);
    }
  }, [screen, assembled]);

  useEffect(() => {
    if (screen === "guidance") {
      analytics.guidanceViewed(result.tier?.instrument ?? "none");
    }
  }, [screen, result.tier?.instrument]);

  // Mount-only: pick up any saved progress and offer it. Marks bootstrap complete so the save effect
  // below never fires before this has run (which would clobber the saved blob with the empty form).
  useEffect(() => {
    const saved = loadProgress();
    if (saved) setResumable(saved);
    bootstrapped.current = true;
  }, []);

  // Persist progress to this device as the citizen works. Held off until (a) the mount load ran and
  // (b) the resume banner is resolved, and only once there is something worth saving.
  const worthSaving = screen !== "intake" || form.unitsBilled.trim() !== "" || form.periodFrom !== "";
  useEffect(() => {
    if (!bootstrapped.current || resumable || !worthSaving) return;
    saveProgress({ form, stage, priorRef, screen });
  }, [form, stage, priorRef, screen, resumable, worthSaving]);

  function applyResume() {
    if (!resumable) return;
    setForm(resumable.form);
    setStage(resumable.stage);
    setPriorRef(resumable.priorRef);
    setScreen(resumable.screen);
    setResumable(null);
  }

  function dismissResume() {
    clearProgress();
    setResumable(null);
  }

  function submitIntake() {
    const found = validateIntake(form);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      // Zero-PII analytics: the diagnosis just ran; report the outcome as a bucketed range only.
      analytics.diagnosisStarted();
      analytics.overchargeCalculated(result.calculation?.overcharge ?? 0, result.diagnosis.isActionable);
      setScreen("results");
    }
  }

  function restart() {
    clearProgress();
    setResumable(null);
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
        <StepProgress steps={stepLabels} current={SCREEN_STEP[screen]} />
      </div>

      <h1 style={{ font: "var(--text-h1)", marginBottom: "var(--space-5)" }}>{t(`screens.${screen}`)}</h1>

      {resumable && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Alert tone="info" title={t("resume.title")}>
            <p style={{ marginBottom: "var(--space-3)" }}>{t("resume.body")}</p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={applyResume}>
                {t("resume.resume")}
              </Button>
              <Button variant="secondary" onClick={dismissResume}>
                {t("resume.startFresh")}
              </Button>
            </div>
          </Alert>
        </div>
      )}

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
          circle={input.circle}
          rtiSidecar={rtiSidecar}
          onBack={() => setScreen("documents")}
          onRestart={restart}
        />
      )}
    </main>
  );
}

export default CheckFlow;
