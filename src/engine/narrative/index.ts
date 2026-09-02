// Public surface of the narrative module (T6).
// The impure `NarrativeGenerator` seam + the pure caged-prompt builder.

export { FakeNarrativeGenerator, default as FakeNarrativeGeneratorDefault } from "./port";
export type { NarrativeGenerator, NarrativeInput } from "./port";

export {
  buildNarrativePrompt,
  buildNarrativeUserContent,
  NARRATIVE_SYSTEM_PROMPT,
} from "./prompt";
export type { NarrativePrompt } from "./prompt";
