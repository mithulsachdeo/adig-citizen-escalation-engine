"use client";
import React from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { CostBreakdown } from "@/components/CostBreakdown";
import type { PipelineResult } from "@/engine/types";
import { inr } from "./format";

// Results screen (spec stories 4–7). Order matters:
//   1. When there is an overcharge, LEAD with the disconnection reassurance + the specific
//      pay-under-protest rupee figure (fear is the #1 blocker — spec Further Notes).
//   2. Then the honest diagnosis (incl. "this bill looks genuine" when nothing is wrong).
//   3. Then the overcharge estimate with its caveat caption.
//   4. Then the evidence checklist to gather before escalating.

const DIAGNOSIS_TITLE: Record<string, string> = {
  slab_jump: "Slab-jump overcharge detected",
  average_billing: "Estimated / average-billing overcharge detected",
  smart_meter_catch_up: "Meter catch-up overcharge detected",
  legitimate: "This bill looks genuine",
  unsupported: "Not supported yet",
};

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

  // The fair amount to pay under protest = the whole bill minus the disputed overcharge (spec:
  // "pay the fair amount ... dispute the rest"). Only shown when the bill amount is known.
  const fairAmount =
    typeof amountBilled === "number" && overcharge > 0
      ? Math.max(0, Math.round(amountBilled) - Math.round(overcharge))
      : undefined;

  const title = DIAGNOSIS_TITLE[diagnosis.classification] ?? "Result";

  return (
    <div className="adig-stack">
      {/* 1. Reassurance + pay-under-protest figure — only when there is something to dispute. */}
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

      {/* 2. Honest diagnosis. */}
      <Card
        eyebrow="Diagnosis"
        title={title}
        accent={actionable ? "coral" : "green"}
      >
        <p>{diagnosis.summary}</p>
        {diagnosis.rationale && (
          <p style={{ marginTop: "var(--space-3)", color: "var(--ink-faint)" }}>
            {diagnosis.rationale}
          </p>
        )}
      </Card>

      {/* 3. The estimate (or an honest "can't compute" note). */}
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
