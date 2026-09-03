import Link from "next/link";
import { Header } from "@/components/Header";
import { Alert } from "@/components/Alert";
import { Footer } from "@/components/Footer";
import { Mascot } from "@/components/Mascot";
import { RiggedMascot } from "@/components/RiggedMascot";
import { CostBreakdown } from "@/components/CostBreakdown";

// design.md "Lightning Flow": 5 steps with fixed accents (blue/coral/yellow/pink/brand-green),
// laid out along an angular zigzag path rather than a straight stack.
const FLOW: { label: string; desc: string; accent: "blue" | "coral" | "yellow" | "pink" | "green"; dot: string }[] = [
  { label: "Diagnose", desc: "Find out what went wrong with your bill.", accent: "blue", dot: "var(--accent-blue)" },
  { label: "Calculate", desc: "Estimate how much you were overcharged.", accent: "coral", dot: "var(--accent-coral)" },
  { label: "Evidence", desc: "Know exactly what to gather.", accent: "yellow", dot: "var(--accent-yellow)" },
  { label: "Generate", desc: "Get the right complaint, filled in for you.", accent: "pink", dot: "var(--accent-pink)" },
  { label: "Submit", desc: "Where and how to file it — step by step.", accent: "green", dot: "var(--brand-green)" },
];

export default function Home() {
  return (
    <>
      <Header />

      {/* ---- Hero: full-bleed green band, text left, live product-peek right ---- */}
      <section className="adig-hero adig-fade-up">
        <div className="adig-wide adig-hero__grid">
          {/* Left — the pitch, left-aligned */}
          <div>
            <span className="adig-chip">
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-coral)" }} />
              For Maharashtra / MSEDCL bills
            </span>
            <h1 style={{ font: "var(--text-display)", letterSpacing: "var(--display-tracking)", marginBlock: "var(--space-4) var(--space-3)" }}>
              Your electricity bill looks too high?
            </h1>
            <p style={{ font: "var(--text-lead)", color: "var(--ink)", maxWidth: 520 }}>
              Adig checks whether you were overcharged, estimates by how much, and generates the exact
              complaint to get it corrected — for free, with nothing stored.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
              <Link
                href="/check"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, minHeight: 48,
                  padding: "16px 32px 16px 22px", font: "var(--text-lead)", fontWeight: 700,
                  background: "var(--ink)", color: "var(--white)", borderRadius: "var(--radius-pill)", textDecoration: "none",
                }}
              >
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand-green)" }} />
                Check my bill
              </Link>
              <span style={{ font: "var(--text-small)", fontWeight: 600, color: "var(--brand-green-ink)" }}>
                ~2 minutes · No sign-up · Nothing saved
              </span>
            </div>
          </div>

          {/* Right — a sample result, seated on a cream card for contrast */}
          <div className="adig-peek">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ font: "var(--text-small)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>
                Sample result
              </span>
              <Mascot expression="sad" size={72} alt="" />
            </div>
            <CostBreakdown
              label="Likely overcharge"
              total={4200}
              items={[
                { label: "Energy charge — as billed", amount: 6800 },
                { label: "Energy charge — lawful pro-rata", amount: 2600 },
              ]}
              caption="Example only. Estimated on the energy-charge component, per MERC Supply Code Reg 16.1.1."
            />
          </div>
        </div>
      </section>

      {/* ---- Lightning Flow: the angular zigzag path ---- */}
      <section className="adig-wide" style={{ paddingBlock: "var(--space-7)" }}>
        <h2 style={{ marginBottom: "var(--space-4)" }}>How Adig helps</h2>
        <ol className="adig-zig" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {/* decorative angled connector path (desktop only; hidden ≤880px) */}
          <svg className="adig-zig__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points="10,10 30,44 50,10 70,44 90,10"
              fill="none"
              stroke="var(--brand-green-ink)"
              strokeWidth={2}
              strokeDasharray="4 5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.45}
            />
          </svg>
          {FLOW.map((step, i) => (
            <li key={step.label} className="adig-zig__step">
              <div className="adig-step adig-sticker-lift">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: step.dot }} />
                  <span style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Step {i + 1}
                  </span>
                </div>
                <h3 style={{ marginBottom: 6 }}>{step.label}</h3>
                <p style={{ font: "var(--text-small)", color: "var(--ink-soft)" }}>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Reassurance (fear is the #1 blocker — spec Further Notes) ---- */}
      <section className="adig-wide" style={{ paddingBlock: "var(--space-6)" }}>
        <div className="adig-reassure">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "flex-start" }}>
            {/* Rigged SVG mascot (earn-its-place candidate) shown here for side-by-side judging vs the PNG in the hero/results. */}
            <RiggedMascot expression="helping" size={128} />
            <h2 style={{ margin: 0 }}>Afraid your power will be cut?</h2>
          </div>
          <Alert tone="info" title="Pay the fair amount under protest — keep your power on">
            You get at least 15 days&rsquo; notice before any disconnection. Adig tells you the specific
            fair amount to pay under written protest so your connection stays on while you dispute the rest.
          </Alert>
        </div>
      </section>

      <Footer />
    </>
  );
}
