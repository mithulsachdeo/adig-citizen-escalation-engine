"use client";
import React, { useRef, useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SelectField, BooleanField, DateField } from "./fields";
import type { FormState } from "./state";
import { useT } from "@/i18n/context";
import { BillGuide } from "@/components/BillGuide";
import { BillUploader } from "@/components/BillUploader";
import { CIRCLES } from "@/engine/routing";
import { analytics } from "@/lib/analytics";
import type { ExtractedBill } from "@/lib/billExtract/types";

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
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [energyChargeVerifyRequired, setEnergyChargeVerifyRequired] = useState(false);

  const handleFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (autoFilledFields.has(key)) {
      try {
        analytics.fieldCorrectedAfterExtract(key);
      } catch {
        /* analytics must never break the flow */
      }
      setAutoFilledFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    if (key === "energyChargeBilled") {
      setEnergyChargeVerifyRequired(false);
    }
    setField(key, value);
  };

  const handleBillExtracted = (extracted: ExtractedBill) => {
    const filled = new Set<string>();
    if (extracted.unitsBilled !== undefined) {
      setField("unitsBilled", String(extracted.unitsBilled));
      filled.add("unitsBilled");
    }
    if (extracted.periodFrom) {
      setField("periodFrom", extracted.periodFrom);
      filled.add("periodFrom");
    }
    if (extracted.periodTo) {
      setField("periodTo", extracted.periodTo);
      filled.add("periodTo");
    }
    if (extracted.amountBilled !== undefined) {
      setField("amountBilled", String(extracted.amountBilled));
      filled.add("amountBilled");
    }
    if (extracted.readingType) {
      setField("readingType", extracted.readingType);
      filled.add("readingType");
    }
    if (extracted.category) {
      setField("category", extracted.category);
      filled.add("category");
    }
    if (extracted.energyChargeBilled !== undefined) {
      setField("energyChargeBilled", String(extracted.energyChargeBilled));
      filled.add("energyChargeBilled");
      if (extracted.energyChargeVerifyRequired) {
        setEnergyChargeVerifyRequired(true);
      }
    } else {
      setEnergyChargeVerifyRequired(false);
    }
    // circle and priorMonthlyAvgUnits are deliberately NOT auto-filled (circle = wrong forum risk; priorMonthlyAvgUnits = chart OCR low-value)
    setAutoFilledFields(filled);
  };

  const AutoFilledBadge = ({ field }: { field: string }) => {
    if (!autoFilledFields.has(field)) return null;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "0.4rem",
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "#15803d",
          backgroundColor: "#dcfce7",
          padding: "1px 6px",
          borderRadius: "4px",
          verticalAlign: "middle",
        }}
      >
        ✓ {t("upload.autoFilledBadge")}
      </span>
    );
  };

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
      <BillUploader onExtracted={handleBillExtracted} />
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
            label={<><FieldNum n={1} />{t("intake.unitsLabel")}<AutoFilledBadge field="unitsBilled" /></>}
            type="number"
            inputMode="numeric"
            required
            value={form.unitsBilled}
            onChange={(e) => handleFieldChange("unitsBilled", e.target.value)}
            unit="kWh"
            error={errors.unitsBilled}
          />
        </div>

        <div className="adig-stack-sm">
          <div data-field="periodFrom">
            <DateField
              label={<><FieldNum n={2} />{t("intake.periodFrom")}<AutoFilledBadge field="periodFrom" /></>}
              required
              value={form.periodFrom}
              onChange={(v) => handleFieldChange("periodFrom", v)}
              error={errors.periodFrom}
            />
          </div>
          <div data-field="periodTo">
            <DateField
              label={<><FieldNum n={2} />{t("intake.periodTo")}<AutoFilledBadge field="periodTo" /></>}
              required
              value={form.periodTo}
              onChange={(v) => handleFieldChange("periodTo", v)}
              error={errors.periodTo}
            />
          </div>
        </div>

        <div data-field="amountBilled">
          <Input
            label={<><FieldNum n={3} />{t("intake.amountLabel")}<AutoFilledBadge field="amountBilled" /></>}
            type="number"
            inputMode="numeric"
            required
            value={form.amountBilled}
            onChange={(e) => handleFieldChange("amountBilled", e.target.value)}
            unit="₹"
            placeholder={t("intake.amountPlaceholder")}
            error={errors.amountBilled}
          />
        </div>

        <div data-field="energyChargeBilled">
          {autoFilledFields.size > 0 && form.energyChargeBilled && energyChargeVerifyRequired && (
            <div
              role="alert"
              style={{
                backgroundColor: "#eff6ff",
                color: "#1e40af",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                padding: "0.55rem 0.75rem",
                fontSize: "0.82rem",
                marginBottom: "0.5rem",
                lineHeight: 1.4,
              }}
            >
              ℹ️ {t("upload.verifyEnergyChargeNote").replace("{amount}", form.energyChargeBilled)}
            </div>
          )}
          {autoFilledFields.size > 0 && !form.energyChargeBilled && (
            <div
              role="alert"
              style={{
                backgroundColor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                borderRadius: "6px",
                padding: "0.55rem 0.75rem",
                fontSize: "0.82rem",
                marginBottom: "0.5rem",
                lineHeight: 1.4,
              }}
            >
              💡 {t("upload.energyChargeNote")}
            </div>
          )}
          <Input
            label={<>{t("intake.energyChargeLabel")}<AutoFilledBadge field="energyChargeBilled" /></>}
            type="number"
            inputMode="numeric"
            required
            value={form.energyChargeBilled}
            onChange={(e) => handleFieldChange("energyChargeBilled", e.target.value)}
            unit="₹"
            placeholder={t("intake.energyChargePlaceholder")}
            help={t("intake.energyChargeHelp")}
            error={errors.energyChargeBilled}
          />
        </div>

        <div data-field="readingType">
          <SelectField
            label={<><FieldNum n={4} />{t("intake.readingLabel")}<AutoFilledBadge field="readingType" /></>}
            required
            value={form.readingType}
            onChange={(v) => handleFieldChange("readingType", v)}
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
            label={<><FieldNum n={5} />{t("intake.categoryLabel")}<AutoFilledBadge field="category" /></>}
            required
            value={form.category}
            onChange={(v) => handleFieldChange("category", v)}
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
