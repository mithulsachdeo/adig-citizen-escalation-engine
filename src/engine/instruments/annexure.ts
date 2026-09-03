// Overcharge-calculation annexure (pure). Renders the engine's slab-by-slab breakdown as a
// fixed-width, monospace-friendly "Annexure A" for the generated complaint (spec: numbers are
// deterministic + verified; the LLM never writes any figure). The same CalculationResult drives
// the on-screen tables in ResultsStep — this is only the document rendering.

import type { CalculationResult, SlabCharge } from "../types";

function bandLabel(s: SlabCharge): string {
  return s.toUnit === null ? `${s.fromUnit}+` : `${s.fromUnit}–${s.toUnit}`;
}

function rupees(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** A right-aligned fixed-width table (monospace lines up the columns in the letter). */
function table(rows: SlabCharge[]): string[] {
  const header = ["Slab (units)", "Units", "Rate", "Charge (Rs)"];
  const body = rows.map((s) => [
    bandLabel(s),
    String(Math.round(s.units)),
    s.rate.toFixed(2),
    rupees(s.charge),
  ]);
  const grid = [header, ...body];
  const w = header.map((_, i) => Math.max(...grid.map((r) => r[i].length)));
  const fmt = (r: string[]) =>
    r.map((c, i) => (i === 0 ? c.padEnd(w[i]) : c.padStart(w[i]))).join("   ");
  const rule = w.map((n) => "-".repeat(n)).join("   ");
  return [fmt(header), rule, ...body.map(fmt)];
}

/**
 * Build the "Annexure A" text for the calculation. Returns the full section (its own heading down).
 * Only call this when there is a real overcharge computed (not unsupported / outside-coverage).
 */
export function formatOverchargeAnnexure(calc: CalculationResult): string {
  const totalUnits = calc.actualBreakdown.reduce((sum, s) => sum + s.units, 0);
  const months = calc.monthsInPeriod && calc.monthsInPeriod > 0 ? calc.monthsInPeriod : 1;
  const perMonth = Math.round(totalUnits / months);

  const lines: string[] = [];
  lines.push(`ANNEXURE A - OVERCHARGE CALCULATION (tariff ${calc.tableLabel})`);
  lines.push("");
  lines.push(
    `Total ${Math.round(totalUnits)} units were billed over ${months} equivalent month(s), ` +
      `i.e. about ${perMonth} units/month.`
  );
  lines.push("");
  lines.push("1) As billed - all units lumped into a single billing period:");
  lines.push(...table(calc.actualBreakdown));
  lines.push(`   Subtotal (energy charge): Rs ${rupees(calc.actualEnergyCharge)}`);
  lines.push("");
  lines.push(
    "2) Lawful monthly-equivalent pro-rata (Supply Code 2021, Reg. 16.1.1) - each equivalent"
  );
  lines.push("   month charged at the monthly telescopic slabs, then summed:");
  lines.push(...table(calc.lawfulBreakdown));
  lines.push(`   Subtotal (energy charge): Rs ${rupees(calc.lawfulEnergyCharge)}`);
  lines.push("");
  lines.push(
    `Estimated overcharge (energy-charge component) = Rs ${rupees(calc.actualEnergyCharge)} ` +
      `- Rs ${rupees(calc.lawfulEnergyCharge)} = Rs ${rupees(calc.overcharge)}`
  );
  // NB: the estimate caveat is intentionally NOT part of the annexure body. It is a hedge addressed to
  // the citizen, shown on-screen only; assembleInstrument appends it for display and omits it from the
  // submission copy (copy/download).
  return lines.join("\n");
}

export default formatOverchargeAnnexure;
