import Link from "next/link";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";

// Placeholder — the full intake → results → documents flow lands in T7.
export default function CheckPage() {
  return (
    <>
      <Header />
      <main className="adig-container" style={{ paddingBlock: "var(--space-6)" }}>
        <Card eyebrow="Coming next" title="Bill check" accent="blue">
          <p>The step-by-step bill check is being built. Check back shortly.</p>
          <p style={{ marginTop: "var(--space-4)" }}>
            <Link href="/">← Back to home</Link>
          </p>
        </Card>
      </main>
    </>
  );
}
