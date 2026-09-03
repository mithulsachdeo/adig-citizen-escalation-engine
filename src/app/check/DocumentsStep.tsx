"use client";
import React, { useState } from "react";
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
  const needsPriorRef = result.error?.code === "missing_prior_tier_ref";

  const stageOptions = [
    { value: "new", label: t("documents.stageNew") },
    { value: "icrs_ignored", label: t("documents.stageIcrs") },
    { value: "cgrf_rejected", label: t("documents.stageCgrf") },
  ];

  // Copy + download the SUBMISSION version — the filed letter without the citizen-facing self-help
  // disclaimer or estimate caveat (those stay on-screen only). See assembleInstrument.bodyForSubmission.
  function copy() {
    if (!assembled) return;
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
        onChange={setStage}
        options={stageOptions}
        help={t("documents.stageHelp")}
        placeholder={t("documents.stageNew")}
      />

      {/* Optional free-text account → the caged narrative (any language; nothing legal derived from it). */}
      <TextareaField
        label={t("documents.descLabel")}
        value={description}
        onChange={setDescription}
        placeholder={t("documents.descPlaceholder")}
        help={t("documents.descHelp")}
      />

      {/* Schedule A / B rungs must cite the prior tier (spec story 10). */}
      {needsPriorRef && (
        <Card eyebrow={t("documents.priorEyebrow")} title={t("documents.priorTitle")} accent="blue">
          <p style={{ marginBottom: "var(--space-4)" }}>{result.error?.message}</p>
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

      {/* The assembled letter. */}
      {!needsPriorRef &&
        (narrativeLoading || !assembled ? (
          <Card title={t("documents.preparingTitle")} accent="pink">
            <p style={{ color: "var(--ink-faint)" }}>{t("documents.preparingBody")}</p>
          </Card>
        ) : (
          <>
            <DocumentPreview
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
        ))}

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={onNext}
          disabled={needsPriorRef || !assembled}
        >
          {t("documents.next")}
        </Button>
      </div>
    </div>
  );
}
