"use client";
import React from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SelectField, BooleanField, DateField } from "./fields";
import type { FormState } from "./state";
import { useT } from "@/i18n/context";

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
  const t = useT();
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
          {t("intake.legend")}
        </legend>

        <Input
          label={t("intake.unitsLabel")}
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
            label={t("intake.periodFrom")}
            required
            value={form.periodFrom}
            onChange={(v) => setField("periodFrom", v)}
            error={errors.periodFrom}
          />
          <DateField
            label={t("intake.periodTo")}
            required
            value={form.periodTo}
            onChange={(v) => setField("periodTo", v)}
            error={errors.periodTo}
          />
        </div>

        <Input
          label={t("intake.amountLabel")}
          type="number"
          inputMode="numeric"
          value={form.amountBilled}
          onChange={(e) => setField("amountBilled", e.target.value)}
          unit="₹"
          placeholder={t("intake.amountPlaceholder")}
        />

        <SelectField
          label={t("intake.readingLabel")}
          required
          value={form.readingType}
          onChange={(v) => setField("readingType", v)}
          error={errors.readingType}
          help={t("intake.readingHelp")}
          placeholder={t("common.select")}
          options={[
            { value: "actual", label: t("intake.readingActual") },
            { value: "estimated", label: t("intake.readingEstimated") },
          ]}
        />

        <SelectField
          label={t("intake.categoryLabel")}
          required
          value={form.category}
          onChange={(v) => setField("category", v)}
          error={errors.category}
          placeholder={t("common.select")}
          options={[{ value: "LT-I-B-residential", label: t("intake.categoryResidential") }]}
        />

        <Input
          label={t("intake.circleLabel")}
          value={form.circle}
          onChange={(e) => setField("circle", e.target.value)}
          placeholder={t("intake.circlePlaceholder")}
        />

        <SelectField
          label={t("intake.meterLabel")}
          value={form.meterType}
          onChange={(v) => setField("meterType", v)}
          options={[
            { value: "regular", label: t("intake.meterRegular") },
            { value: "smart", label: t("intake.meterSmart") },
          ]}
          placeholder={t("intake.meterPlaceholder")}
        />

        <Input
          label={t("intake.priorAvgLabel")}
          type="number"
          inputMode="numeric"
          value={form.priorMonthlyAvgUnits}
          onChange={(e) => setField("priorMonthlyAvgUnits", e.target.value)}
          unit="kWh"
          placeholder={t("intake.priorAvgPlaceholder")}
        />

        <BooleanField
          label={t("intake.recentSwapLabel")}
          checked={form.recentMeterSwap}
          onChange={(c) => setField("recentMeterSwap", c)}
          help={t("intake.recentSwapHelp")}
        />
      </fieldset>

      <div className="adig-sticky-cta">
        <Button type="submit" variant="primary" fullWidth size="lg">
          {t("intake.submit")}
        </Button>
      </div>
    </form>
  );
}
