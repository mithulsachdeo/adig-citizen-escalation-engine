"use client";
import React, { useState } from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import type { PipelineResult, Routing, Sidecar, FilingStep } from "@/engine/types";
import type { AssembledInstrument } from "@/engine/instruments";
import { getTierRouting, CIRCLES } from "@/engine/routing";
import { SelectField } from "./fields";
import { useT } from "@/i18n/context";

// Guidance / Submit screen (spec D18, story 8). Shows, for the selected rung, WHERE and HOW to file:
// forum, channel, address/contact, timeline, AND a numbered "how to file" walkthrough. Routing comes from
// the verbatim routing module (T8); the walkthrough's structure (order, portal link, letter action,
// verify-flag) is on `routing.filingSteps` and its sentences resolve via t(). Online steps (ICRS) carry a
// real deep link + a "copy your letter" action at the paste step; offline steps carry no link and a
// "download to print" action instead. We render only what's present and flag volatile detail rather than
// presenting a guess as fact. UI labels go through t() (i18n seam).

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 2, paddingBlock: "var(--space-3)", borderBottom: "1px solid var(--line)" }}>
      <dt style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {term}
      </dt>
      <dd style={{ margin: 0, font: "var(--text-body)", color: "var(--ink)", whiteSpace: "pre-wrap" }}>{children}</dd>
    </div>
  );
}

// The "how to file" walkthrough for one forum. `letter` is the citizen's submission text (the selected
// tier's letter, minus on-screen hedges); it powers the copy (online paste) / download (offline print)
// actions. When absent, those actions simply don't render — the steps still show.
function FilingSteps({
  steps,
  letter,
  letterFilename,
}: {
  steps: FilingStep[];
  letter?: string;
  letterFilename?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const hasLink = steps.some((s) => s.link);

  function copy() {
    if (!letter) return;
    navigator.clipboard?.writeText(letter).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false)
    );
  }

  function download() {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = letterFilename ?? "complaint.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ marginTop: "var(--space-5)" }}>
      <h4 style={{ font: "var(--text-h3)", marginBottom: "var(--space-3)" }}>{t("guidance.filingHeading")}</h4>
      {hasLink && (
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginBottom: "var(--space-4)" }}>
          {t("guidance.newTabNote")}
        </p>
      )}
      <ol style={{ margin: 0, paddingLeft: "1.4em", display: "grid", gap: "var(--space-4)" }}>
        {steps.map((step) => (
          <li key={step.textKey} style={{ font: "var(--text-body)", color: "var(--ink)" }}>
            <span>{t(step.textKey)}</span>
            {step.link && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <a
                  href={step.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 700, color: "var(--accent-blue-ink, var(--ink))" }}
                >
                  {t(step.link.labelKey)} ↗
                </a>
              </div>
            )}
            {step.letterAction === "copy" && letter && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <Button variant="secondary" onClick={copy}>
                  {copied ? t("guidance.letterCopied") : t("guidance.copyLetter")}
                </Button>
              </div>
            )}
            {step.letterAction === "download" && letter && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <Button variant="secondary" onClick={download}>
                  {t("guidance.downloadLetter")}
                </Button>
              </div>
            )}
            {step.verifyAtSource && (
              <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginTop: "var(--space-2)" }}>
                {t("guidance.stepVerify")}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginTop: "var(--space-3)" }}>
        {copied ? t("guidance.letterCopiedStatus") : " "}
      </p>
    </div>
  );
}

function RoutingCard({
  eyebrow,
  title,
  accent,
  routing,
  confidence,
  letter,
  letterFilename,
}: {
  eyebrow: string;
  title: string;
  accent: "green" | "blue" | "pink" | "yellow";
  routing: Routing;
  confidence: "verified" | "draft";
  /** The citizen's submission text, for the copy/download step actions. Omit for cards with no letter (e.g. RTI). */
  letter?: string;
  letterFilename?: string;
}) {
  const t = useT();
  return (
    <Card eyebrow={eyebrow} title={title} accent={accent}>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Badge variant={confidence} />
      </div>
      <dl style={{ margin: 0 }}>
        <Detail term={t("guidance.forum")}>{routing.forumName}</Detail>
        {routing.channel && <Detail term={t("guidance.howToFile")}>{routing.channel}</Detail>}
        {routing.address && <Detail term={t("guidance.address")}>{routing.address}</Detail>}
        {routing.contact && <Detail term={t("guidance.contact")}>{routing.contact}</Detail>}
        {routing.slaText && <Detail term={t("guidance.timeline")}>{routing.slaText}</Detail>}
      </dl>
      {routing.filingSteps && routing.filingSteps.length > 0 && (
        <FilingSteps steps={routing.filingSteps} letter={letter} letterFilename={letterFilename} />
      )}
      {routing.verifyAtSource && (
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginTop: "var(--space-3)" }}>
          {t("guidance.verifyAtSource")}
        </p>
      )}
    </Card>
  );
}

export function GuidanceStep({
  result,
  circle,
  setCircle,
  rtiSidecar,
  assembled,
  onBack,
  onRestart,
}: {
  result: PipelineResult;
  /** Citizen's MSEDCL circle — resolves the jurisdictional CGRF forum (spec D18). */
  circle?: string;
  /** Late (just-in-time) circle capture on the CGRF tier when none was chosen at intake (spec D29). */
  setCircle?: (value: string) => void;
  rtiSidecar?: Sidecar;
  /** The selected tier's assembled letter; its submission body powers the copy/download step actions. */
  assembled?: AssembledInstrument | null;
  onBack: () => void;
  onRestart: () => void;
}) {
  const t = useT();
  const tier = result.tier;
  // Circle only changes the CGRF tier; getTierRouting returns the same constant for the others and a
  // circle-agnostic generic CGRF when the circle is unknown (never a wrong-forum guess).
  const tierRouting = tier ? getTierRouting(tier.instrument, circle) ?? tier.routing : null;

  // Just-in-time circle capture: on the CGRF tier with no circle yet, offer the picker so the citizen
  // can upgrade the generic fallback to their exact forum. Picking updates the shared form state live.
  const needsCircle = tier?.instrument === "cgrf-schedule-a" && !circle && !!setCircle;

  // The letter to surface in the walkthrough — only when it matches THIS tier's card (the RTI sidecar
  // has no generated letter, so its steps carry no copy/download action).
  const letter = assembled?.bodyForSubmission;
  const letterFilename = assembled ? `${assembled.instrument}.txt` : undefined;

  return (
    <div className="adig-stack">
      <Card eyebrow={t("progress.submit")} title={t("guidance.submitTitle")} accent="green">
        <p>{t("guidance.submitIntro")}</p>
      </Card>

      {needsCircle && setCircle && (
        <Card eyebrow={t("guidance.forum")} title={t("guidance.circlePickerTitle")} accent="blue">
          <SelectField
            label={t("intake.circleLabel")}
            value=""
            onChange={setCircle}
            help={t("guidance.circlePickerHelp")}
            placeholder={t("intake.circleNotSure")}
            options={CIRCLES}
          />
        </Card>
      )}

      {tier && tierRouting ? (
        <RoutingCard
          eyebrow={tier.instrumentName}
          title={tierRouting.forumName}
          accent="blue"
          routing={tierRouting}
          confidence={tier.confidence}
          letter={letter}
          letterFilename={letterFilename}
        />
      ) : (
        <Alert tone="info" title={t("guidance.noSubmissionTitle")}>
          {t("guidance.noSubmissionBody")}
        </Alert>
      )}

      {/* RTI evidence sidecar — available at any stage to pull meter / reading logs (spec D15). No generated
          letter here, so its steps deliberately carry no copy/download action. */}
      {rtiSidecar?.routing && (
        <RoutingCard
          eyebrow={t("guidance.optionalEvidence")}
          title={rtiSidecar.name}
          accent="yellow"
          routing={rtiSidecar.routing}
          confidence={rtiSidecar.confidence}
        />
      )}

      <Alert tone="info" title={t("guidance.advocateTitle")}>
        {t("guidance.advocateBody")}
      </Alert>

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button variant="primary" fullWidth onClick={onRestart}>
          {t("common.checkAnother")}
        </Button>
      </div>
    </div>
  );
}
