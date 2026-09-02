"use client";

// Production wiring of the NarrativeGenerator seam (T6 note → T7 owns the client impl).
//
// Depends only on the `NarrativeGenerator` interface. It POSTs the citizen's facts to the
// serverless /api/narrative route (key stays server-side) and, on ANY failure — network error,
// non-200, missing key (503), blocked/empty upstream (502), malformed JSON — falls back to the
// deterministic offline `FakeNarrativeGenerator` so the letter always renders. The flow must never
// wedge on a narrative hiccup (T6 contract).

import { FakeNarrativeGenerator } from "@/engine/narrative";
import type { NarrativeGenerator, NarrativeInput } from "@/engine/narrative";

export class ApiNarrativeGenerator implements NarrativeGenerator {
  private readonly fallback = new FakeNarrativeGenerator();

  async generate(input: NarrativeInput): Promise<string> {
    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = (await res.json()) as { narrative?: unknown };
        if (typeof data.narrative === "string" && data.narrative.trim().length > 0) {
          return data.narrative;
        }
      }
    } catch {
      // Swallow and fall back — a narrative failure must not block the flow.
    }
    return this.fallback.generate(input);
  }
}

export default ApiNarrativeGenerator;
