"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Input } from "@/components/Input";
import { DocumentPreview } from "@/components/DocumentPreview";
import { SelectField, TextareaField } from "./fields";
import type { PipelineResult } from "@/engine/types";
import type { AssembledInstrument } from "@/engine/instruments";
import type { PriorRefState } from "./state";
import { useT, useLanguage } from "@/i18n/context";
import { analytics } from "@/lib/analytics";

// Documents screen (spec D15/D16, story 10–12). A declared-stage selector picks the ladder rung;
// Schedule A / B rungs additionally need the prior-tier reference. The letter body is composed from
// the deterministic template + the caged narrative (fetched in the parent, with an offline fallback),
// and rendered in the DocumentPreview with the correct verified/draft badge. Download + copy provided.

export function DocumentsStep({
  result,
  stage,
  setStage,
  priorRef,
  setPriorRef,
  description,
  setDescription,
  assembled,
  narrativeLoading,
  onBack,
  onNext,
}: {
  result: PipelineResult;
  stage: string;
  setStage: (stage: string) => void;
  priorRef: PriorRefState;
  setPriorRef: (next: PriorRefState) => void;
  description: string;
  setDescription: (value: string) => void;
  assembled: AssembledInstrument | null;
  narrativeLoading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const tier = assembled?.instrument ?? result.tier?.instrument ?? "none";

  // Attach native copy listener scoped specifically to the letter preview container.
  useEffect(() => {
    const el = previewRef.current;
    if (!el || !assembled) return;
    function onCopy() {
      analytics.letterObtained(tier, "copy_event", "documents");
    }
    el.addEventListener("copy", onCopy);
    return () => {
      el.removeEventListener("copy", onCopy);
    };
  }, [assembled, tier]);

  // Show the prior-tier-ref inputs based on the STABLE "this stage needs a prior ref" signal, so they
  // stay visible while the citizen types. `needsPriorRef` is the TRANSIENT "still missing" state — it
  // clears on the first keystroke, so it must only drive the missing-ref message / letter-not-ready
  // prompt, never the input section's visibility (that bug made the whole section vanish mid-typing).
  const requiresPriorRef = !!result.tier?.requiresPriorTierRef;
  const needsPriorRef = result.error?.code === "missing_prior_tier_ref";

  const initialStage = useRef(stage);
  const stageChangedFired = useRef(false);
  const higherRungFired = useRef(false);
  const priorRefEnteredFired = useRef(false);

  function handleStageChange(newStage: string) {
    if (!stageChangedFired.current && newStage !== initialStage.current) {
      stageChangedFired.current = true;
      try {
        analytics.stageChanged(newStage);
      } catch {
        /* analytics must never break the flow */
      }
    }
    setStage(newStage);
  }

  useEffect(() => {
    if (requiresPriorRef && !higherRungFired.current) {
      higherRungFired.current = true;
      try {
        analytics.higherRungSelected(stage);
      } catch {
        /* analytics must never break the flow */
      }
    }
  }, [requiresPriorRef, stage]);

  useEffect(() => {
    if (priorRef.referenceNo.trim() !== "" && !priorRefEnteredFired.current) {
      priorRefEnteredFired.current = true;
      try {
        analytics.priorRefEntered();
      } catch {
        /* analytics must never break the flow */
      }
    }
  }, [priorRef.referenceNo]);

  const stageOptions = [
    { value: "new", label: t("documents.stageNew") },
    { value: "icrs_ignored", label: t("documents.stageIcrs") },
    { value: "cgrf_rejected", label: t("documents.stageCgrf") },
  ];

  // Copy + download the SUBMISSION version — the filed letter without the citizen-facing self-help
  // disclaimer or estimate caveat (those stay on-screen only). See assembleInstrument.bodyForSubmission.
  function copy() {
    if (!assembled) return;
    analytics.letterObtained(tier, "copy_button", "documents");
    navigator.clipboard?.writeText(assembled.bodyForSubmission).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false)
    );
  }

  function download() {
    if (!assembled) return;
    analytics.letterObtained(tier, "download", "documents");
    const blob = new Blob([assembled.bodyForSubmission], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assembled.instrument}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="adig-stack">
      <Card eyebrow={t("documents.eyebrow")} title={t("documents.title")} accent="pink">
        <p>{t("documents.intro")}</p>
      </Card>

      {/* In Marathi mode, state that the generated instrument itself stays English (the forums accept it). */}
      {lang === "mr" && (
        <Alert tone="info" title={t("guidance.englishDocNote")}>{" "}</Alert>
      )}

      <SelectField
        label={t("documents.stageLabel")}
        value={stage}
        onChange={handleStageChange}
        options={stageOptions}
        help={t("documents.stageHelp")}
        placeholder={t("common.select")}
      />

      {/* Optional free-text account → the caged narrative (any language; nothing legal derived from it). */}
      <TextareaField
        label={t("documents.descLabel")}
        value={description}
        onChange={setDescription}
        placeholder={t("documents.descPlaceholder")}
        help={t("documents.descHelp")}
      />

      {/* Schedule A / B rungs must cite the prior tier (spec story 10). Gated on requiresPriorRef (stable)
          so the inputs persist while typing; the missing-ref message shows only while it is still missing. */}
      {requiresPriorRef && (
        <Card eyebrow={t("documents.priorEyebrow")} title={t("documents.priorTitle")} accent="blue">
          {needsPriorRef && <p style={{ marginBottom: "var(--space-4)" }}>{result.error?.message}</p>}
          <div className="adig-stack-sm">
            <Input
              label={t("documents.priorRefNo")}
              required
              value={priorRef.referenceNo}
              onChange={(e) => setPriorRef({ ...priorRef, referenceNo: e.target.value })}
            />
            <Input
              label={t("documents.priorDate")}
              type="date"
              required
              value={priorRef.date}
              onChange={(e) => setPriorRef({ ...priorRef, date: e.target.value })}
            />
            <Input
              label={t("documents.priorOutcome")}
              value={priorRef.outcome}
              onChange={(e) => setPriorRef({ ...priorRef, outcome: e.target.value })}
            />
          </div>
        </Card>
      )}

      {/* The assembled letter — shown once ready. Until a required prior-tier ref is entered the letter
          cannot assemble, so prompt for it; otherwise show the preparing state while the narrative loads. */}
      {!assembled ? (
        needsPriorRef ? (
          <p style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>{t("documents.priorRefHint")}</p>
        ) : (
          <Card title={t("documents.preparingTitle")} accent="pink">
            <p style={{ color: "var(--ink-faint)" }}>{t("documents.preparingBody")}</p>
          </Card>
        )
      ) : (
          <>
            <DocumentPreview
              ref={previewRef}
              title={assembled.title}
              badge={<Badge variant={assembled.confidence} />}
              draft={assembled.confidence === "draft"}
            >
              {assembled.body}
            </DocumentPreview>

            <div className="adig-stack-sm">
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <Button variant="secondary" onClick={download}>
                  {t("documents.download")}
                </Button>
                <Button variant="secondary" onClick={copy}>
                  {copied ? t("documents.copied") : t("documents.copy")}
                </Button>
              </div>
              <p role="status" aria-live="polite" style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>
                {copied ? t("documents.copiedStatus") :" "}
              </p>
            </div>

            {assembled.confidence === "draft" && (
              <Alert tone="warning" title={t("documents.draftTitle")}>
                {t("documents.draftBody")}
              </Alert>
            )}
          </>
        )}

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={onNext}
          disabled={!assembled}
        >
          {t("documents.next")}
        </Button>
      </div>
    </div>
  );
}
