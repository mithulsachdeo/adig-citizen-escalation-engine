"use client";
import React, { useRef } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SelectField, BooleanField, DateField } from "./fields";
import type { FormState } from "./state";
import { useT } from "@/i18n/context";
import { BillGuide } from "@/components/BillGuide";
import { CIRCLES } from "@/engine/routing";
import { analytics } from "@/lib/analytics";

// Intake screen (spec story 1). Collects the UserInput fields — rates are NOT asked (spec D12).
// Accessibility: the whole set is a <fieldset> with a <legend>; every control has a visible label
// (from Input / SelectField / BooleanField); required fields marked and errors announced inline.

type Errors = Partial<Record<keyof FormState, string>>;

// Numbered badge matching the bill-guide markers, so field ③ ↔ bill ③.
function FieldNum({ n }: { n: number }) {
  return <span className="adig-fieldnum" aria-hidden="true">{n}</span>;
}

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
  const reachedFields = useRef(new Set<string>());

  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement | null;
    const key = target?.closest?.("[data-field]")?.getAttribute("data-field");
    if (key && !reachedFields.current.has(key)) {
      reachedFields.current.add(key);
      try {
        analytics.fieldReached(key);
      } catch {
        /* analytics must never break the flow */
      }
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <BillGuide />

      <fieldset
        style={{ border: "none", padding: 0, margin: 0 }}
        className="adig-stack"
        onFocusCapture={handleFocusCapture}
      >
        <legend style={{ font: "var(--text-small)", color: "var(--ink-faint)", marginBottom: 4 }}>
          {t("intake.legend")}
        </legend>

        <div data-field="unitsBilled">
          <Input
            label={<><FieldNum n={1} />{t("intake.unitsLabel")}</>}
            type="number"
            inputMode="numeric"
            required
            value={form.unitsBilled}
            onChange={(e) => setField("unitsBilled", e.target.value)}
            unit="kWh"
            error={errors.unitsBilled}
          />
        </div>

        <div className="adig-stack-sm">
          <div data-field="periodFrom">
            <DateField
              label={<><FieldNum n={2} />{t("intake.periodFrom")}</>}
              required
              value={form.periodFrom}
              onChange={(v) => setField("periodFrom", v)}
              error={errors.periodFrom}
            />
          </div>
          <div data-field="periodTo">
            <DateField
              label={<><FieldNum n={2} />{t("intake.periodTo")}</>}
              required
              value={form.periodTo}
              onChange={(v) => setField("periodTo", v)}
              error={errors.periodTo}
            />
          </div>
        </div>

        <div data-field="amountBilled">
          <Input
            label={<><FieldNum n={3} />{t("intake.amountLabel")}</>}
            type="number"
            inputMode="numeric"
            required
            value={form.amountBilled}
            onChange={(e) => setField("amountBilled", e.target.value)}
            unit="₹"
            placeholder={t("intake.amountPlaceholder")}
            error={errors.amountBilled}
          />
        </div>

        <div data-field="energyChargeBilled">
          <Input
            label={t("intake.energyChargeLabel")}
            type="number"
            inputMode="numeric"
            required
            value={form.energyChargeBilled}
            onChange={(e) => setField("energyChargeBilled", e.target.value)}
            unit="₹"
            placeholder={t("intake.energyChargePlaceholder")}
            help={t("intake.energyChargeHelp")}
            error={errors.energyChargeBilled}
          />
        </div>

        <div data-field="readingType">
          <SelectField
            label={<><FieldNum n={4} />{t("intake.readingLabel")}</>}
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
        </div>

        <div data-field="category">
          <SelectField
            label={<><FieldNum n={5} />{t("intake.categoryLabel")}</>}
            required
            value={form.category}
            onChange={(v) => setField("category", v)}
            error={errors.category}
            placeholder={t("common.select")}
            options={[{ value: "LT-I-B-residential", label: t("intake.categoryResidential") }]}
          />
        </div>

        {/* Dropdown (spec D29): the ~45 official circles pick the exact CGRF forum. Optional — the empty
            default reads "Not sure / other", which routes to the generic fallback (never a wrong forum). */}
        <div data-field="circle">
          <SelectField
            label={<><FieldNum n={6} />{t("intake.circleLabel")}</>}
            value={form.circle}
            onChange={(v) => setField("circle", v)}
            help={t("intake.circleHelp")}
            placeholder={t("intake.circleNotSure")}
            options={CIRCLES}
          />
        </div>

        <div data-field="meterType">
          <SelectField
            label={<>{t("intake.meterLabel")} <span className="adig-fieldnote">· {t("intake.notOnBill")}</span></>}
            value={form.meterType}
            onChange={(v) => setField("meterType", v)}
            options={[
              { value: "regular", label: t("intake.meterRegular") },
              { value: "smart", label: t("intake.meterSmart") },
            ]}
            placeholder={t("intake.meterPlaceholder")}
          />
        </div>

        <div data-field="priorMonthlyAvgUnits">
          <Input
            label={<><FieldNum n={7} />{t("intake.priorAvgLabel")}</>}
            type="number"
            inputMode="numeric"
            value={form.priorMonthlyAvgUnits}
            onChange={(e) => setField("priorMonthlyAvgUnits", e.target.value)}
            unit="kWh"
            placeholder={t("intake.priorAvgPlaceholder")}
          />
        </div>

        <div data-field="recentMeterSwap">
          <BooleanField
            label={<>{t("intake.recentSwapLabel")} <span className="adig-fieldnote">· {t("intake.notOnBill")}</span></>}
            checked={form.recentMeterSwap}
            onChange={(c) => setField("recentMeterSwap", c)}
            help={t("intake.recentSwapHelp")}
          />
        </div>
      </fieldset>

      <div className="adig-sticky-cta">
        <Button type="submit" variant="primary" fullWidth size="lg">
          {t("intake.submit")}
        </Button>
      </div>
    </form>
  );
}
