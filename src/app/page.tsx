"use client";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Alert } from "@/components/Alert";
import { Footer } from "@/components/Footer";
import { Mascot } from "@/components/Mascot";
import { CostBreakdown } from "@/components/CostBreakdown";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { useT } from "@/i18n/context";

// design.md "Lightning Flow": 5 steps with fixed accents (blue/coral/yellow/pink/brand-green),
// laid out along an angular zigzag path rather than a straight stack. Labels/descriptions are keyed
// (landing.flow.*) so the flow toggles language.
const FLOW: { key: string; accent: "blue" | "coral" | "yellow" | "pink" | "green"; dot: string }[] = [
  { key: "diagnose", accent: "blue", dot: "var(--accent-blue)" },
  { key: "calculate", accent: "coral", dot: "var(--accent-coral)" },
  { key: "evidence", accent: "yellow", dot: "var(--accent-yellow)" },
  { key: "generate", accent: "pink", dot: "var(--accent-pink)" },
  { key: "submit", accent: "green", dot: "var(--brand-green)" },
];

export default function Home() {
  const t = useT();
  return (
    <>
      <LandingAnalytics />
      <Header />

      {/* ---- Hero: full-bleed green band, text left, live product-peek right ---- */}
      <section className="adig-hero adig-fade-up">
        <div className="adig-wide adig-hero__grid">
          {/* Left — the pitch, left-aligned */}
          <div>
            <span className="adig-chip">
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-coral)" }} />
              {t("landing.chip")}
            </span>
            <h1 style={{ font: "var(--text-display)", letterSpacing: "var(--display-tracking)", marginBlock: "var(--space-4) var(--space-3)" }}>
              {t("landing.h1")}
            </h1>
            <p style={{ font: "var(--text-lead)", color: "var(--ink)", maxWidth: 520 }}>
              {t("landing.lead")}
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
                {t("landing.ctaCheck")}
              </Link>
              <span style={{ font: "var(--text-small)", fontWeight: 600, color: "var(--brand-green-ink)" }}>
                {t("landing.ctaSub")}
              </span>
            </div>
          </div>

          {/* Right — a sample result, seated on a cream card for contrast */}
          <div className="adig-peek">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ font: "var(--text-small)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>
                {t("landing.sampleResult")}
              </span>
              <Mascot expression="sad" size={72} alt="" />
            </div>
            <CostBreakdown
              label={t("landing.likelyOvercharge")}
              total={4200}
              items={[
                { label: t("landing.sampleEnergyBilled"), amount: 6800 },
                { label: t("landing.sampleEnergyLawful"), amount: 2600 },
              ]}
              caption={t("landing.sampleCaption")}
            />
          </div>
        </div>
      </section>

      {/* ---- Benediction: a reverent full-bleed moment after the hero. The brand meaning
           ("steadfast / unshakeable") set as an inscription on ink, with a faint charged glow and a
           single gold spark (the A-bolt motif). Stays Sanskrit in both languages (Devanagari is universal). ---- */}
      <section style={{ position: "relative", background: "var(--ink)", paddingBlock: "clamp(3.5rem, 9vw, 6rem)", overflow: "hidden" }}>
        {/* faint charged glow — the electricity motif, behind the text */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(55% 65% at 50% 42%, rgba(142, 212, 98, 0.16), transparent 70%)",
          }}
        />
        <div className="adig-wide" style={{ position: "relative", textAlign: "center" }}>
          {/* a single spark — a short gold rule for the brand bolt (drawn, not a glyph) */}
          <span
            aria-hidden="true"
            style={{ display: "inline-block", width: 40, height: 3, borderRadius: "var(--radius-pill)", background: "var(--accent-yellow)", marginBottom: "var(--space-5)" }}
          />
          <p lang="sa" style={{ font: "var(--text-h1)", lineHeight: 1.35, fontWeight: 600, color: "var(--canvas)", maxWidth: "18ch", marginInline: "auto" }}>
            भवतः अधिकारेषु स्थिराः भवन्तु
          </p>
          <p style={{ font: "var(--text-small)", fontStyle: "italic", letterSpacing: "0.02em", color: "var(--canvas)", opacity: 0.6, marginTop: "var(--space-3)" }}>
            bhavatah adhikareshu sthirah bhavantu
          </p>
          <p style={{ font: "var(--text-lead)", color: "var(--canvas)", opacity: 0.85, marginTop: "var(--space-2)" }}>
            “May you be steadfast in your rights.”
          </p>
        </div>
      </section>

      {/* ---- Lightning Flow: the angular zigzag path ---- */}
      <section className="adig-wide" style={{ paddingBlock: "var(--space-7)" }}>
        <h2 style={{ marginBottom: "var(--space-4)" }}>{t("landing.howTitle")}</h2>
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
            <li key={step.key} className="adig-zig__step">
              <div className="adig-step adig-sticker-lift">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: step.dot }} />
                  <span style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {t("landing.stepLabel")} {i + 1}
                  </span>
                </div>
                <h3 style={{ marginBottom: 6 }}>{t(`landing.flow.${step.key}Label`)}</h3>
                <p style={{ font: "var(--text-small)", color: "var(--ink-soft)" }}>{t(`landing.flow.${step.key}Desc`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Reassurance (fear is the #1 blocker — spec Further Notes) ---- */}
      <section className="adig-wide" style={{ paddingBlock: "var(--space-6)" }}>
        <div className="adig-reassure">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "flex-start" }}>
            {/* Animated SVG mascot in helping pose */}
            <Mascot expression="helping" size={128} />
            <h2 style={{ margin: 0 }}>{t("landing.reassureHeading")}</h2>
          </div>
          <Alert tone="info" title={t("landing.reassureAlertTitle")}>
            {t("landing.reassureAlertBody")}
          </Alert>
        </div>
      </section>

      <Footer />
    </>
  );
}
