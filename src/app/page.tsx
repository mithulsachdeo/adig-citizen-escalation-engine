import Link from "next/link";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { Alert } from "@/components/Alert";

// design.md "Lightning Flow": 5 steps with fixed accents (blue/coral/yellow/pink/brand-green).
const FLOW: { label: string; desc: string; accent: "blue" | "coral" | "yellow" | "pink" | "green" }[] = [
  { label: "Diagnose", desc: "Find out what went wrong with your bill.", accent: "blue" },
  { label: "Calculate", desc: "Estimate how much you were overcharged.", accent: "coral" },
  { label: "Evidence", desc: "Know exactly what to gather.", accent: "yellow" },
  { label: "Generate", desc: "Get the right complaint, filled in for you.", accent: "pink" },
  { label: "Submit", desc: "Where and how to file it — step by step.", accent: "green" },
];

export default function Home() {
  return (
    <>
      <Header />

      {/* ---- Hero ---- */}
      <section className="adig-container adig-fade-up" style={{ paddingBlock: "var(--space-6) var(--space-7)", textAlign: "center" }}>
        <p style={{ font: "var(--text-small)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
          For Maharashtra / MSEDCL bills
        </p>
        <h1 style={{ font: "var(--text-display)", letterSpacing: "var(--display-tracking)", marginBlock: "var(--space-3)" }}>
          Your electricity bill looks too high?
        </h1>
        <p style={{ font: "var(--text-lead)", color: "var(--ink-soft)", maxWidth: 540, marginInline: "auto" }}>
          Adig checks whether you were overcharged, estimates by how much, and generates the exact
          complaint to get it corrected — for free, with nothing stored.
        </p>

        {/* mascot — sad in the hero (design.md) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascot/mascot-sad.png"
          alt="Adig's electric-man mascot, looking worried about a high bill"
          width={180}
          height={180}
          style={{ marginInline: "auto", marginBlock: "var(--space-5)" }}
        />

        <Link
          href="/check"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minHeight: 48,
            padding: "16px 32px 16px 22px",
            font: "var(--text-lead)",
            fontWeight: 700,
            background: "var(--ink)",
            color: "var(--white)",
            borderRadius: "var(--radius-pill)",
            textDecoration: "none",
          }}
        >
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand-green)" }} />
          Check my bill
        </Link>
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginTop: "var(--space-3)" }}>
          Takes ~2 minutes · No sign-up · Nothing saved
        </p>
      </section>

      {/* ---- Lightning Flow ---- */}
      <section className="adig-container" style={{ paddingBlock: "var(--space-6)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "var(--space-5)" }}>How Adig helps</h2>
        <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--space-4)" }}>
          {FLOW.map((step, i) => (
            <li key={step.label}>
              <Card eyebrow={`Step ${i + 1}`} title={step.label} accent={step.accent} lift>
                {step.desc}
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Reassurance (fear is the #1 blocker — spec Further Notes) ---- */}
      <section className="adig-container" style={{ paddingBlock: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: "var(--space-4)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/mascot-helping.png" alt="" width={72} height={72} aria-hidden="true" className="mascot" />
          <h2 style={{ margin: 0 }}>Afraid your power will be cut?</h2>
        </div>
        <Alert tone="info" title="Pay the fair amount under protest — keep your power on">
          You get at least 15 days&rsquo; notice before any disconnection. Adig tells you the specific
          fair amount to pay under written protest so your connection stays on while you dispute the rest.
        </Alert>
      </section>

      {/* ---- Footer / disclaimer ---- */}
      <footer className="adig-container app-chrome" style={{ paddingBlock: "var(--space-7)", borderTop: "1px solid var(--line)", marginTop: "var(--space-6)" }}>
        <p style={{ font: "var(--text-small)", color: "var(--ink-faint)" }}>
          Adig is a self-help tool, not legal advice. Overcharge figures are estimates based on standard
          pro-rata rules. We store nothing you enter.
        </p>
      </footer>
    </>
  );
}
