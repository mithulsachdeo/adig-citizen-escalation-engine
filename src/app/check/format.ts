// Small display formatters for the check flow (T7). Pure, UI-only — no engine logic here.

/** ISO (YYYY-MM-DD) → "2 September 2026" (en-IN). Falls back to the raw string if unparseable. */
export function formatDateLong(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Human-readable disputed billing period for the letter subject / narrative. */
export function formatBillPeriod(from: string, to: string): string {
  if (from && to) return `${formatDateLong(from)} – ${formatDateLong(to)}`;
  return from || to || "";
}

/** Rupee figure with en-IN grouping, no decimals (matches CostBreakdown). */
export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Today's date as an ISO string (client clock). Used for the instrument date. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
