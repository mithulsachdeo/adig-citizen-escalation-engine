"use client";
import React, { useState } from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { CostBreakdown } from "@/components/CostBreakdown";
import { Mascot, type MascotExpression, type MascotReaction } from "@/components/Mascot";
import type { CalculationResult, PipelineResult, SlabCharge } from "@/engine/types";
import { inr } from "./format";

// Results screen (spec stories 4–7). Order (revised): the screen is titled "What we found", so it
// LEADS with the diagnosis (the finding), then the disconnection reassurance immediately after (fear
// is still addressed in the first screenful — spec D17), then the estimate WITH the full slab-by-slab
// working (trust), then the evidence checklist.

const DIAGNOSIS_TITLE: Record<string, string> = {
  slab_jump: "Slab-jump overcharge detected",
  average_billing: "Estimated / average-billing overcharge detected",
  smart_meter_catch_up: "Meter catch-up overcharge detected",
  legitimate: "This bill looks genuine",
  unsupported: "Not supported yet",
};

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
  return (
    <div>
      <p style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{title}</p>
      <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--text-small)", color: "var(--ink-soft)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th style={{ ...cellLabel, ...headCell }}>Slab (units)</th>
            <th style={{ ...cellNum, ...headCell }}>Units</th>
            <th style={{ ...cellNum, ...headCell }}>₹/unit</th>
            <th style={{ ...cellNum, ...headCell }}>Charge</th>
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
              Subtotal (energy charge)
            </td>
            <td style={{ ...cellNum, fontWeight: 700, color: "var(--ink)" }}>{inr(Math.round(subtotal))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SlabWorking({ calc }: { calc: CalculationResult }) {
  const totalUnits = Math.round(calc.actualBreakdown.reduce((s, r) => s + r.units, 0));
  const months = calc.monthsInPeriod && calc.monthsInPeriod > 0 ? calc.monthsInPeriod : 1;
  const perMonth = Math.round(totalUnits / months);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
      <p style={{ font: "var(--text-small)", color: "var(--ink-soft)" }}>
        Your <strong>{totalUnits} units</strong> over <strong>{months} equivalent month
        {months === 1 ? "" : "s"}</strong> ≈ {perMonth} units/month, each month charged at the monthly slabs.
      </p>
      <SlabTable title="As billed — all units lumped into one period" rows={calc.actualBreakdown} subtotal={calc.actualEnergyCharge} />
      <SlabTable
        title="Lawful monthly-equivalent pro-rata (Reg. 16.1.1)"
        rows={calc.lawfulBreakdown}
        subtotal={calc.lawfulEnergyCharge}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingTop: 10, borderTop: "2px solid var(--ink)", font: "var(--text-h3)", color: "var(--ink)" }}>
        <span>Difference = overcharge</span>
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
  const { diagnosis, calculation, evidence } = result;
  const actionable = diagnosis.isActionable;
  const overcharge = calculation?.overcharge ?? 0;
  const unsupported = calculation?.unsupported === true;
  const noPriceableData = calculation?.tableLabel === "outside verified tariff data";
  const partialCoverage = calculation?.outsideVerifiedTariff === true && !noPriceableData;

  const [showWorking, setShowWorking] = useState(false);

  const fairAmount =
    typeof amountBilled === "number" && overcharge > 0
      ? Math.max(0, Math.round(amountBilled) - Math.round(overcharge))
      : undefined;

  const title = DIAGNOSIS_TITLE[diagnosis.classification] ?? "Result";

  // The mascot reacts to the verdict: relieved-happy when genuine, rallying-helping when overcharged.
  const relieved = diagnosis.classification === "legitimate";
  const rallying = actionable && overcharge > 0;
  const mascotExpression: MascotExpression = relieved ? "happy" : rallying ? "helping" : "neutral";
  const mascotReaction: MascotReaction = relieved ? "hop" : rallying ? "tilt" : "none";

  const showWorkingToggle = !unsupported && !noPriceableData && calculation != null && overcharge > 0;

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
                Diagnosis
              </span>
            </div>
            <div style={{ font: "var(--text-h2)", color: "var(--ink)", marginTop: 4 }}>{title}</div>
          </div>
        </div>
        <p>{diagnosis.summary}</p>
        {diagnosis.rationale && (
          <p style={{ marginTop: "var(--space-3)", color: "var(--ink-faint)" }}>{diagnosis.rationale}</p>
        )}
      </Card>

      {/* 2. Reassurance + pay-under-protest figure — immediately after the finding, when there is an overcharge. */}
      {actionable && overcharge > 0 && (
        <Alert tone="info" title="Your power will not be cut off">
          You get at least 15 days&rsquo; written notice before any disconnection.{" "}
          {fairAmount !== undefined ? (
            <>
              Pay the fair amount of <strong>{inr(fairAmount)}</strong> under written protest — the
              rest ({inr(overcharge)}, the estimated overcharge) is what you are disputing.
            </>
          ) : (
            <>
              Pay your bill <strong>minus the estimated overcharge of {inr(overcharge)}</strong>{" "}
              under written protest — dispute only that difference.
            </>
          )}{" "}
          Under the proviso to Section 56(1) of the Electricity Act, 2003, supply cannot be
          disconnected for an amount genuinely in dispute and deposited under protest.
        </Alert>
      )}

      {/* 3. The estimate + the full slab-by-slab working (trust). */}
      {unsupported ? (
        <Alert tone="warning" title="This tariff isn't supported yet">
          {calculation?.estimateCaveat}
        </Alert>
      ) : noPriceableData ? (
        <Alert tone="warning" title="Outside our verified tariff data">
          This billing period falls outside the tariff data we have verified, so we cannot compute a
          reliable figure. Adig only shows numbers it can stand behind.
        </Alert>
      ) : (
        calculation && (
          <div className="adig-stack-sm">
            <CostBreakdown
              label={overcharge > 0 ? "Likely overcharge" : "Overcharge"}
              total={Math.round(overcharge)}
              items={[
                { label: "Energy charge — as billed", amount: Math.round(calculation.actualEnergyCharge) },
                { label: "Energy charge — lawful pro-rata", amount: Math.round(calculation.lawfulEnergyCharge) },
              ]}
              caption={calculation.estimateCaveat}
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
                  {showWorking ? "Hide" : "See"} the full slab-by-slab working
                </button>
                {showWorking && <SlabWorking calc={calculation} />}
              </div>
            )}

            {partialCoverage && (
              <Alert tone="warning" title="Figure covers only part of the period">
                Part of this billing period is outside our verified tariff data, so the estimate
                above covers only the months we could price ({calculation.tableLabel}).
              </Alert>
            )}
          </div>
        )
      )}

      {/* 4. Evidence checklist (spec story 3/4). */}
      {actionable && evidence.length > 0 && (
        <Card eyebrow="Evidence" title="Gather these before you file" accent="yellow">
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--space-3)" }}>
            {evidence.map((item) => (
              <li key={item.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ marginTop: 2 }}>
                  •
                </span>
                <span>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{item.label}</span>
                  {item.description && (
                    <span style={{ display: "block", color: "var(--ink-faint)", font: "var(--text-small)" }}>
                      {item.description}
                    </span>
                  )}
                  {item.confidence === "draft" && (
                    <span style={{ display: "inline-block", marginTop: 6 }}>
                      <Badge variant="draft" />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        {actionable ? (
          <Button variant="primary" fullWidth onClick={onNext}>
            Get my document
          </Button>
        ) : (
          <Button variant="primary" fullWidth onClick={onBack}>
            Check another bill
          </Button>
        )}
      </div>
    </div>
  );
}
