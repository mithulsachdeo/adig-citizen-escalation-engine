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

// Documents screen (spec D15/D16, story 10–12). A declared-stage selector picks the ladder rung;
// Schedule A / B rungs additionally need the prior-tier reference. The letter body is composed from
// the deterministic template + the caged narrative (fetched in the parent, with an offline fallback),
// and rendered in the DocumentPreview with the correct verified/draft badge. Download + copy provided.

const STAGE_OPTIONS = [
  { value: "new", label: "I just got the bill" },
  { value: "icrs_ignored", label: "MSEDCL (ICRS) did not resolve it" },
  { value: "cgrf_rejected", label: "CGRF rejected it / did not decide" },
];

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
  const [copied, setCopied] = useState(false);
  const needsPriorRef = result.error?.code === "missing_prior_tier_ref";

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
      <Card eyebrow="Document" title="Generate your escalation letter" accent="pink">
        <p>
          Tell us where you are stuck and we&rsquo;ll assemble the correct instrument for that stage —
          the legal grounds and forum are fixed and checked against the regulations; only your own
          facts are filled in.
        </p>
      </Card>

      <SelectField
        label="Where are you stuck?"
        value={stage}
        onChange={setStage}
        options={STAGE_OPTIONS}
        help="This selects the next document in the escalation ladder."
        placeholder="I just got the bill"
      />

      {/* Optional free-text account → the caged narrative (any language; nothing legal derived from it). */}
      <TextareaField
        label="In your own words (optional)"
        value={description}
        onChange={setDescription}
        placeholder="Briefly describe what happened — when the bill arrived, how it compares with your usual bills, why you think it's wrong. Any language is fine."
        help="We use this only to write the plain 'statement of facts' paragraph. It never changes the legal wording."
      />

      {/* Schedule A / B rungs must cite the prior tier (spec story 10). */}
      {needsPriorRef && (
        <Card eyebrow="One more thing" title="Reference to the previous stage" accent="blue">
          <p style={{ marginBottom: "var(--space-4)" }}>{result.error?.message}</p>
          <div className="adig-stack-sm">
            <Input
              label="Complaint / order reference number"
              required
              value={priorRef.referenceNo}
              onChange={(e) => setPriorRef({ ...priorRef, referenceNo: e.target.value })}
            />
            <Input
              label="Date of that complaint / order"
              type="date"
              value={priorRef.date}
              onChange={(e) => setPriorRef({ ...priorRef, date: e.target.value })}
            />
            <Input
              label="What happened (e.g. no response, rejected)"
              value={priorRef.outcome}
              onChange={(e) => setPriorRef({ ...priorRef, outcome: e.target.value })}
            />
          </div>
        </Card>
      )}

      {/* The assembled letter. */}
      {!needsPriorRef &&
        (narrativeLoading || !assembled ? (
          <Card title="Preparing your document…" accent="pink">
            <p style={{ color: "var(--ink-faint)" }}>
              Writing the statement-of-facts paragraph and assembling the letter.
            </p>
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
                  Download (.txt)
                </Button>
                <Button variant="secondary" onClick={copy}>
                  {copied ? "Copied ✓" : "Copy text"}
                </Button>
              </div>
              <p role="status" aria-live="polite" style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>
                {copied ? "Letter copied to your clipboard." : " "}
              </p>
            </div>

            {assembled.confidence === "draft" && (
              <Alert tone="warning" title="Draft — confirm before sending">
                Some details in this document are not yet primary-source confirmed. Review every
                figure and the current forum contact before you send it.
              </Alert>
            )}
          </>
        ))}

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={onNext}
          disabled={needsPriorRef || !assembled}
        >
          Where do I send it?
        </Button>
      </div>
    </div>
  );
}
