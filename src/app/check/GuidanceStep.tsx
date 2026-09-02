"use client";
import React from "react";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import type { PipelineResult, Routing, Sidecar } from "@/engine/types";

// Guidance / Submit screen (spec D18, story 8). Shows, for the selected rung, WHERE and HOW to file:
// forum, channel, address/contact, and the timeline. Routing is read from the tier as it exists today
// (T5 embedded most detail in the letter; T8 fills Tier.routing further) — we render only what's present
// and flag anything the tier marks volatile (`verifyAtSource`) rather than presenting a guess as fact.

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
        <Detail term="Forum / office">{routing.forumName}</Detail>
        {routing.channel && <Detail term="How to file">{routing.channel}</Detail>}
        {routing.address && <Detail term="Address">{routing.address}</Detail>}
        {routing.contact && <Detail term="Contact">{routing.contact}</Detail>}
        {routing.slaText && <Detail term="Timeline / deadline">{routing.slaText}</Detail>}
      </dl>
      {routing.verifyAtSource && (
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginTop: "var(--space-3)" }}>
          Contact details for this forum can change — confirm the current address and channel from the
          official MSEDCL / MERC source before you send.
        </p>
      )}
    </Card>
  );
}

export function GuidanceStep({
  result,
  rtiSidecar,
  onBack,
  onRestart,
}: {
  result: PipelineResult;
  rtiSidecar?: Sidecar;
  onBack: () => void;
  onRestart: () => void;
}) {
  const tier = result.tier;

  return (
    <div className="adig-stack">
      <Card eyebrow="Submit" title="Where and how to file" accent="green">
        <p>
          File the document you generated at the forum below. Keep a copy and a record of the date you
          submitted it.
        </p>
      </Card>

      {tier ? (
        <RoutingCard
          eyebrow={tier.instrumentName}
          title={tier.routing.forumName}
          accent="blue"
          routing={tier.routing}
          confidence={tier.confidence}
        />
      ) : (
        <Alert tone="info" title="No submission needed">
          There is no escalation for this bill, so there is nothing to file.
        </Alert>
      )}

      {/* RTI evidence sidecar — available at any stage to pull meter / reading logs (spec D15). */}
      {rtiSidecar?.routing && (
        <RoutingCard
          eyebrow="Optional evidence tool"
          title={rtiSidecar.name}
          accent="yellow"
          routing={rtiSidecar.routing}
          confidence={rtiSidecar.confidence}
        />
      )}

      <Alert tone="info" title="You present the matter yourself">
        At the CGRF and the Electricity Ombudsman an Advocate cannot appear as your representative
        (MERC CGRF &amp; EO Regulations, 2020). A lawyer may help you draft, but you present it
        yourself. Adig is a self-help tool, not legal advice.
      </Alert>

      <div className="adig-sticky-cta">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onRestart}>
          Check another bill
        </Button>
      </div>
    </div>
  );
}
