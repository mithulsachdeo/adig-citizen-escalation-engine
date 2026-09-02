// NarrativeGenerator port (T6; spec §"Test seams", second seam; D10).
//
// This is the ONLY impure dependency in the whole engine. Everything else — diagnosis,
// calculation, tier selection, instrument assembly — is pure. The narrative (the "statement
// of facts" paragraph, spec story 12) is the single hole filled by a language model, and it is
// CAGED: the model normalizes the citizen's free-text account (in ANY language/script) into one
// short, plain-English factual paragraph and does NOTHING legal — no citation, section, SLA,
// deadline, or forum. Those come from the deterministic templates (see ../instruments).
//
// Keep this seam pluggable: pipeline/UI code depends on the `NarrativeGenerator` interface only.
// Tests inject `FakeNarrativeGenerator` (deterministic, offline); production wires an
// implementation that POSTs to the /api/narrative serverless route (see src/app/api/narrative).

/**
 * Structured facts the narrative may weave in, plus the citizen's own words. Every field is
 * optional — the tool stores nothing and not all facts are always known. The generator must not
 * invent anything beyond what is given here.
 */
export interface NarrativeInput {
  /**
   * The citizen's own free-text account, in ANY language/script (Hindi, Marathi, Hinglish,
   * romanized, mixed). The generator normalizes/translates it to English. Optional: with no
   * free text the generator writes a plain paragraph from the structured facts alone.
   */
  userDescription?: string;
  /** Diagnosis code (e.g. 'slab_jump'); a hint for framing, never surfaced as a legal label. */
  classification?: string;
  /** Human-readable disputed billing period, e.g. "May 2026" or "12 Apr–13 May 2026". */
  billPeriod?: string;
  unitsBilled?: number;
  /** The citizen's usual monthly units, for the "much higher than usual" comparison. */
  priorMonthlyAvgUnits?: number;
  amountBilled?: number;
  /** 'actual' | 'estimated' — an estimated reading is a relevant fact to state. */
  readingType?: string;
  /** 'regular' | 'smart'. */
  meterType?: string;
}

/**
 * The impure seam. `generate` returns the finished English facts paragraph. Implementations must
 * never throw legal content into it; the contract is enforced by the caged prompt (see ./prompt).
 */
export interface NarrativeGenerator {
  generate(input: NarrativeInput): Promise<string>;
}

/** Round a rupee figure for prose (no decimals). */
function inr(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Deterministic, offline stand-in for the real (LLM-backed) generator. Same input ⇒ same output,
 * so pipeline tests are stable and never touch the network. It composes a plain factual paragraph
 * from the structured facts and echoes the citizen's own words verbatim — it does NOT translate
 * (that is the real model's job) and, like the real one, emits NO legal citation.
 */
export class FakeNarrativeGenerator implements NarrativeGenerator {
  async generate(input: NarrativeInput): Promise<string> {
    const sentences: string[] = [];

    const period = input.billPeriod?.trim();
    const units =
      typeof input.unitsBilled === "number" ? `${input.unitsBilled} units` : undefined;
    const amount =
      typeof input.amountBilled === "number" ? inr(input.amountBilled) : undefined;

    if (period && units && amount) {
      sentences.push(`For the billing period ${period}, I was billed for ${units}, amounting to ${amount}.`);
    } else if (period && units) {
      sentences.push(`For the billing period ${period}, I was billed for ${units}.`);
    } else if (units && amount) {
      sentences.push(`I was billed for ${units}, amounting to ${amount}.`);
    } else if (units) {
      sentences.push(`I was billed for ${units}.`);
    } else if (period) {
      sentences.push(`I am disputing my electricity bill for the period ${period}.`);
    } else {
      sentences.push(`I am disputing a recent electricity bill.`);
    }

    if (typeof input.priorMonthlyAvgUnits === "number") {
      sentences.push(
        `My usual monthly consumption is about ${input.priorMonthlyAvgUnits} units, so this bill is much higher than normal.`
      );
    }

    if (input.readingType === "estimated") {
      sentences.push(`The reading behind this bill was estimated rather than taken from the meter.`);
    }
    if (input.meterType === "smart") {
      sentences.push(`My connection has a smart meter.`);
    }

    const desc = input.userDescription?.trim();
    if (desc) {
      sentences.push(`In my own words: ${desc}`);
    }

    sentences.push(`I believe the amount charged is incorrect and request that it be corrected.`);

    return sentences.join(" ");
  }
}

export default FakeNarrativeGenerator;
