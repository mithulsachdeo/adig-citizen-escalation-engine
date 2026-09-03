"use client";
import React from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SelectField, BooleanField, DateField } from "./fields";
import type { FormState } from "./state";

// Intake screen (spec story 1). Collects the UserInput fields — rates are NOT asked (spec D12).
// Accessibility: the whole set is a <fieldset> with a <legend>; every control has a visible label
// (from Input / SelectField / BooleanField); required fields marked and errors announced inline.

type Errors = Partial<Record<keyof FormState, string>>;

export function IntakeStep({
  form,
  setField,
  errors,
  onSubmit,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  errors: Errors;
  onSubmit: () => void;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <fieldset style={{ border: "none", padding: 0, margin: 0 }} className="adig-stack">
        <legend style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginBottom: 4 }}>
          Enter the details from your disputed bill. We store nothing you type.
        </legend>

        <Input
          label="Units billed (kWh)"
          type="number"
          inputMode="numeric"
          required
          value={form.unitsBilled}
          onChange={(e) => setField("unitsBilled", e.target.value)}
          unit="kWh"
          error={errors.unitsBilled}
        />

        <div className="adig-stack-sm">
          <DateField
            label="Billing period — from"
            required
            value={form.periodFrom}
            onChange={(v) => setField("periodFrom", v)}
            error={errors.periodFrom}
          />
          <DateField
            label="Billing period — to"
            required
            value={form.periodTo}
            onChange={(v) => setField("periodTo", v)}
            error={errors.periodTo}
          />
        </div>

        <Input
          label="Amount billed (Rs)"
          type="number"
          inputMode="numeric"
          value={form.amountBilled}
          onChange={(e) => setField("amountBilled", e.target.value)}
          unit="₹"
          placeholder="Optional, but lets us show the fair amount to pay"
        />

        <SelectField
          label="Reading type"
          required
          value={form.readingType}
          onChange={(v) => setField("readingType", v)}
          error={errors.readingType}
          help="On the bill, usually shown near the meter reading."
          options={[
            { value: "actual", label: "Actual" },
            { value: "estimated", label: "Estimated / Average" },
          ]}
        />

        <SelectField
          label="Consumer category"
          required
          value={form.category}
          onChange={(v) => setField("category", v)}
          error={errors.category}
          options={[{ value: "LT-I-B-residential", label: "Residential (LT-I-B)" }]}
        />

        <Input
          label="MSEDCL circle / sub-division"
          value={form.circle}
          onChange={(e) => setField("circle", e.target.value)}
          placeholder="From your bill (optional)"
        />

        <SelectField
          label="Meter type"
          value={form.meterType}
          onChange={(v) => setField("meterType", v)}
          options={[
            { value: "regular", label: "Regular" },
            { value: "smart", label: "Smart meter" },
          ]}
          placeholder="Optional"
        />

        <Input
          label="Prior monthly average units"
          type="number"
          inputMode="numeric"
          value={form.priorMonthlyAvgUnits}
          onChange={(e) => setField("priorMonthlyAvgUnits", e.target.value)}
          unit="kWh"
          placeholder="Your usual monthly usage (optional)"
        />

        <BooleanField
          label="Meter was recently replaced"
          checked={form.recentMeterSwap}
          onChange={(c) => setField("recentMeterSwap", c)}
          help="Tick this if a new (often smart) meter was installed just before this bill."
        />
      </fieldset>

      <div className="adig-sticky-cta">
        <Button type="submit" variant="primary" fullWidth size="lg">
          Check my bill
        </Button>
      </div>
    </form>
  );
}
