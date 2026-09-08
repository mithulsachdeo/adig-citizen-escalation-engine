"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { CostBreakdown } from "@/components/CostBreakdown";
import { Mascot, type MascotExpression, type MascotReaction } from "@/components/Mascot";
import type { CalculationResult, PipelineResult, SlabCharge } from "@/engine/types";
import { inr } from "./format";
import { useT, useLanguage } from "@/i18n/context";
import { analytics } from "@/lib/analytics";

// Results screen (spec stories 4–7). Order (revised): the screen is titled "What we found", so it
// LEADS with the diagnosis (the finding), then the disconnection reassurance immediately after (fear
// is still addressed in the first screenful — spec D17), then the estimate WITH the full slab-by-slab
// working (trust), then the evidence checklist.

function bandLabel(s: SlabCharge): string {
  return s.toUnit === null ? `${s.fromUnit}+` : `${s.fromUnit}–${s.toUnit}`;
}

const cellNum: React.CSSProperties = {
  textAlign: "right",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  padding: "6px 0",
};
const cellLabel: React.CSSProperties = { textAlign: "left", padding: "6px 0" };
const headCell: React.CSSProperties = {
  font: "var(--text-small)",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function SlabTable({ title, rows, subtotal }: { title: string; rows: SlabCharge[]; subtotal: number }) {
  const t = useT();
  return (
    <div>
      <p style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{title}</p>
      <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--text-small)", color: "var(--ink-soft)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th style={{ ...cellLabel, ...headCell }}>{t("results.slabHeadSlab")}</th>
            <th style={{ ...cellNum, ...headCell }}>{t("results.slabHeadUnits")}</th>
            <th style={{ ...cellNum, ...headCell }}>{t("results.slabHeadRate")}</th>
            <th style={{ ...cellNum, ...headCell }}>{t("results.slabHeadCharge")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.fromUnit}-${s.toUnit}`} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={cellLabel}>{bandLabel(s)}</td>
              <td style={cellNum}>{Math.round(s.units)}</td>
              <td style={cellNum}>{s.rate.toFixed(2)}</td>
              <td style={cellNum}>{inr(Math.round(s.charge))}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellLabel, fontWeight: 700, color: "var(--ink)" }} colSpan={3}>
              {t("results.slabSubtotal")}
            </td>
            <td style={{ ...cellNum, fontWeight: 700, color: "var(--ink)" }}>{inr(Math.round(subtotal))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SlabWorking({ calc }: { calc: CalculationResult }) {
  const t = useT();
  const totalUnits = Math.round(calc.actualBreakdown.reduce((s, r) => s + r.units, 0));
  const months = calc.monthsInPeriod && calc.monthsInPeriod > 0 ? calc.monthsInPeriod : 1;
  const perMonth = Math.round(totalUnits / months);
  const monthWord = months === 1 ? t("results.monthSingular") : t("results.monthPlural");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
      <p style={{ font: "var(--text-small)", color: "var(--ink-soft)" }}>
        {t("results.workingSentence", { units: totalUnits, months, monthWord, perMonth })}
      </p>
      <SlabTable title={t("results.slabAsBilledTitle")} rows={calc.actualBreakdown} subtotal={calc.actualEnergyCharge} />
      <SlabTable
        title={t("results.slabLawfulTitle")}
        rows={calc.lawfulBreakdown}
        subtotal={calc.lawfulEnergyCharge}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingTop: 10, borderTop: "2px solid var(--ink)", font: "var(--text-h3)", color: "var(--ink)" }}>
        <span>{t("results.differenceOvercharge")}</span>
        <span style={{ whiteSpace: "nowrap" }}>{inr(Math.round(calc.overcharge))}</span>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ transition: "transform 0.18s ease", transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ResultsStep({
  result,
  amountBilled,
  onBack,
  onNext,
}: {
  result: PipelineResult;
  amountBilled?: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const { diagnosis, calculation, evidence } = result;
  const actionable = diagnosis.isActionable;
  const overcharge = calculation?.overcharge ?? 0;
  const unsupported = calculation?.unsupported === true;
  const noPriceableData = calculation?.tableLabel === "outside verified tariff data";
  const partialCoverage = calculation?.outsideVerifiedTariff === true && !noPriceableData;

  const [showWorking, setShowWorking] = useState(false);
  const workingOpenedFired = useRef(false);

  useEffect(() => {
    if (showWorking && !workingOpenedFired.current) {
      workingOpenedFired.current = true;
      try {
        analytics.workingOpened();
      } catch {
        /* analytics must never break the flow */
      }
    }
  }, [showWorking]);

  const fairAmount =
    typeof amountBilled === "number" && overcharge > 0
      ? Math.max(0, Math.round(amountBilled) - Math.round(overcharge))
      : undefined;

  const titleForClass = t(`results.title.${diagnosis.classification}`);
  const title = titleForClass === `results.title.${diagnosis.classification}` ? t("results.fallbackTitle") : titleForClass;

  // Diagnosis summary/rationale: in Marathi, look up the translated sibling by the engine's stable
  // messageKey; the engine's English strings remain the source of truth and the fallback.
  const dx = diagnosis.messageKey;
  const summaryText = lang === "mr" && dx ? t(`results.diagnosis.${dx}.summary`) : diagnosis.summary;
  const rationaleText =
    lang === "mr" && dx ? t(`results.diagnosis.${dx}.rationale`) : diagnosis.rationale;

  // The mascot reacts to the verdict: relieved-happy when genuine, rallying-helping when overcharged.
  const relieved = diagnosis.classification === "legitimate";
  const rallying = actionable && overcharge > 0;
  const mascotExpression: MascotExpression = relieved ? "happy" : rallying ? "helping" : "neutral";
  const mascotReaction: MascotReaction = relieved ? "hop" : rallying ? "tilt" : "none";

  const isLegitimateVerification =
    !actionable &&
    diagnosis.classification === "legitimate" &&
    calculation != null &&
    !unsupported &&
    !noPriceableData;

  const showWorkingToggle =
    !unsupported &&
    !noPriceableData &&
    calculation != null &&
    ((actionable && overcharge > 0) || isLegitimateVerification);

  return (
    <div className="adig-stack">
      {/* 1. The finding — diagnosis leads, mascot tucked beside the title. */}
      <Card accent={actionable ? "coral" : "green"}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-3)" }}>
          <Mascot expression={mascotExpression} reaction={mascotReaction} size={60} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: actionable ? "var(--accent-coral)" : "var(--brand-green)" }} />
              <span style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t("results.diagnosisEyebrow")}
              </span>
            </div>
            <div style={{ font: "var(--text-h2)", color: "var(--ink)", marginTop: 4 }}>{title}</div>
          </div>
        </div>
        <p>{summaryText}</p>
        {rationaleText && (
          <p style={{ marginTop: "var(--space-3)", color: "var(--ink-faint)" }}>{rationaleText}</p>
        )}
      </Card>

      {/* 2. Reassurance + pay-under-protest figure — immediately after the finding, when there is an overcharge. */}
      {actionable && overcharge > 0 && (
        <Alert tone="info" title={t("results.reassureTitle")}>
          {fairAmount !== undefined
            ? t("results.payFair", { fair: inr(fairAmount), overcharge: inr(overcharge) })
            : t("results.payNoFair", { overcharge: inr(overcharge) })}
          {t("results.paySection56")}
        </Alert>
      )}

      {/* 3. The estimate + the full slab-by-slab working (trust). */}
      {unsupported ? (
        <Alert tone="warning" title={t("results.unsupportedTitle")}>
          {calculation?.estimateCaveat}
        </Alert>
      ) : noPriceableData ? (
        <Alert tone="warning" title={t("results.outsideTitle")}>
          {t("results.outsideBody")}
        </Alert>
      ) : actionable && calculation ? (
        <div className="adig-stack-sm">
          {calculation.energyChargeMismatch && (
            <Alert tone="warning" title={t("results.mismatchTitle")}>
              {t("results.mismatchBody")}
            </Alert>
          )}

          <CostBreakdown
            label={overcharge > 0 ? t("results.costLikely") : t("results.costOvercharge")}
            total={Math.round(overcharge)}
            items={[
              { label: t("results.energyBilled"), amount: Math.round(calculation.actualEnergyCharge) },
              { label: t("results.energyLawful"), amount: Math.round(calculation.lawfulEnergyCharge) },
            ]}
            caption={lang === "mr" ? t("results.estimateCaveat") : calculation.estimateCaveat}
          />

          {showWorkingToggle && (
            <div style={{ background: "var(--canvas-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)" }}>
              <button
                type="button"
                onClick={() => setShowWorking((s) => !s)}
                aria-expanded={showWorking}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  background: "transparent", border: "none", padding: 0, cursor: "pointer",
                  font: "var(--text-small)", fontWeight: 700, color: "var(--ink)", minHeight: 32,
                }}
              >
                <Chevron open={showWorking} />
                {showWorking ? t("results.hideWorking") : t("results.seeWorking")}
              </button>
              {showWorking && <SlabWorking calc={calculation} />}
            </div>
          )}

          {partialCoverage && (
            <Alert tone="warning" title={t("results.partialTitle")}>
              {t("results.partialBody", { label: calculation.tableLabel })}
            </Alert>
          )}
        </div>
      ) : (
        isLegitimateVerification && (
          <div className="adig-stack-sm">
            <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", margin: 0 }}>
              {t("results.verifyScopeNote")}
            </p>

            {calculation.energyChargeMismatch ? (
              <Alert tone="warning" title={t("results.mismatchTitle")}>
                {t("results.mismatchBody")}
              </Alert>
            ) : (
              <p style={{ font: "var(--text-body)", color: "var(--ink-soft)", margin: 0 }}>
                {t("results.verifyConfirm")}
              </p>
            )}

            <CostBreakdown
              items={[
                { label: t("results.energyBilled"), amount: Math.round(calculation.actualEnergyCharge) },
                { label: t("results.energyEstimate"), amount: Math.round(calculation.lawfulEnergyCharge) },
              ]}
              caption={t("results.verifyEstimateNote")}
            />

            {showWorkingToggle && (
              <div style={{ background: "var(--canvas-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)" }}>
                <button
                  type="button"
                  onClick={() => setShowWorking((s) => !s)}
                  aria-expanded={showWorking}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    background: "transparent", border: "none", padding: 0, cursor: "pointer",
                    font: "var(--text-small)", fontWeight: 700, color: "var(--ink)", minHeight: 32,
                  }}
                >
                  <Chevron open={showWorking} />
                  {showWorking ? t("results.hideWorking") : t("results.seeWorking")}
                </button>
                {showWorking && <SlabWorking calc={calculation} />}
              </div>
            )}
          </div>
        )
      )}

      {/* 4. Evidence checklist (spec story 3/4). */}
      {actionable && evidence.length > 0 && (
        <Card eyebrow={t("results.evidenceEyebrow")} title={t("results.evidenceTitle")} accent="yellow">
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--space-3)" }}>
            {evidence.map((item) => {
              const label = lang === "mr" ? t(`evidence.${item.id}.label`) : item.label;
              const description = lang === "mr" ? t(`evidence.${item.id}.description`) : item.description;
              return (
              <li key={item.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ marginTop: 2 }}>
                  •
                </span>
                <span>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{label}</span>
                  {description && (
                    <span style={{ display: "block", color: "var(--ink-faint)", font: "var(--text-small)" }}>
                      {description}
                    </span>
                  )}
                  {item.confidence === "draft" && (
                    <span style={{ display: "inline-block", marginTop: 6 }}>
                      <Badge variant="draft" />
                    </span>
                  )}
                </span>
              </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          {t("common.back")}
        </Button>
        {actionable ? (
          <Button variant="primary" fullWidth onClick={onNext}>
            {t("common.getMyDocument")}
          </Button>
        ) : (
          <Button variant="primary" fullWidth onClick={onBack}>
            {t("common.checkAnother")}
          </Button>
        )}
      </div>
    </div>
  );
}
