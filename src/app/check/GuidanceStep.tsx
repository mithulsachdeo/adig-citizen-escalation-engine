"use client";
import React from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import type { PipelineResult, Routing, Sidecar } from "@/engine/types";
import { getTierRouting } from "@/engine/routing";
import { t } from "@/i18n";

// Guidance / Submit screen (spec D18, story 8). Shows, for the selected rung, WHERE and HOW to file:
// forum, channel, address/contact, and the timeline. Routing comes from the verbatim routing module
// (T8): for the CGRF tier we resolve the jurisdictional forum from the citizen's circle, falling back
// to the tier's circle-agnostic routing. We render only what's present and flag anything marked
// volatile (`verifyAtSource`) rather than presenting a guess as fact. UI labels go through t() (i18n seam).

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

function RoutingCard({
  eyebrow,
  title,
  accent,
  routing,
  confidence,
}: {
  eyebrow: string;
  title: string;
  accent: "green" | "blue" | "pink" | "yellow";
  routing: Routing;
  confidence: "verified" | "draft";
}) {
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
  rtiSidecar,
  onBack,
  onRestart,
}: {
  result: PipelineResult;
  /** Citizen's MSEDCL circle — resolves the jurisdictional CGRF forum (spec D18). */
  circle?: string;
  rtiSidecar?: Sidecar;
  onBack: () => void;
  onRestart: () => void;
}) {
  const tier = result.tier;
  // Circle only changes the CGRF tier; getTierRouting returns the same constant for the others and a
  // circle-agnostic generic CGRF when the circle is unknown (never a wrong-forum guess).
  const tierRouting = tier ? getTierRouting(tier.instrument, circle) ?? tier.routing : null;

  return (
    <div className="adig-stack">
      <Card eyebrow="Submit" title={t("guidance.submitTitle")} accent="green">
        <p>{t("guidance.submitIntro")}</p>
      </Card>

      {tier && tierRouting ? (
        <RoutingCard
          eyebrow={tier.instrumentName}
          title={tierRouting.forumName}
          accent="blue"
          routing={tierRouting}
          confidence={tier.confidence}
        />
      ) : (
        <Alert tone="info" title={t("guidance.noSubmissionTitle")}>
          {t("guidance.noSubmissionBody")}
        </Alert>
      )}

      {/* RTI evidence sidecar — available at any stage to pull meter / reading logs (spec D15). */}
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
