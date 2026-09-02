// Public surface of the instruments module (T5).
// Deterministic legal templates + the pure `assembleInstrument` letter assembler.

export {
  assembleInstrument,
  default as assembleInstrumentDefault,
} from "./assembleInstrument";
export type {
  AssembledInstrument,
  InstrumentFacts,
  PriorTierFact,
} from "./assembleInstrument";

export {
  INSTRUMENT_TEMPLATES,
  getInstrumentTemplate,
  SELF_HELP_DISCLAIMER,
} from "./templates";
export type { InstrumentTemplate } from "./templates";
