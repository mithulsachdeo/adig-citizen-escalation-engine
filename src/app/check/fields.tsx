"use client";
import React, { useId } from "react";

// Form controls the design system does not ship (it only has a single-line <Input>).
// These match the Input component's look (addendum §2: visible <label> tied via htmlFor/id,
// 48px targets, error text + icon via aria-describedby — never colour alone).

const labelStyle: React.CSSProperties = {
  font: "var(--text-small)",
  fontWeight: 600,
  color: "var(--ink-soft)",
};

const helpStyle: React.CSSProperties = {
  font: "var(--text-small)",
  color: "var(--ink-faint)",
};

function Req() {
  return (
    <span aria-hidden="true" style={{ color: "var(--accent-coral)" }}>
      {" *"}
    </span>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span
      id={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        font: "var(--text-small)",
        color: "var(--severity-high)",
      }}
    >
      <span aria-hidden="true">⚠</span>
      {children}
    </span>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  help,
  error,
  placeholder = "Select…",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  required?: boolean;
  help?: string;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const helpId = `${id}-help`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required && <Req />}
      </label>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--white)",
          border: `2px solid ${error ? "var(--severity-high)" : "var(--line)"}`,
          borderRadius: "var(--radius-md)",
          padding: "0 12px 0 20px",
          minHeight: 48,
        }}
      >
        <select
          id={id}
          value={value}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : help ? helpId : undefined}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            font: "var(--text-body)",
            color: value ? "var(--ink)" : "var(--ink-faint)",
            minHeight: 46,
            cursor: "pointer",
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
      {help && !error && (
        <span id={helpId} style={helpStyle}>
          {help}
        </span>
      )}
      {error && <ErrorText id={errId}>{error}</ErrorText>}
    </div>
  );
}

export function BooleanField({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={help ? helpId : undefined}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 24, height: 24, accentColor: "var(--brand-green)", cursor: "pointer" }}
        />
        <label htmlFor={id} style={{ ...labelStyle, cursor: "pointer" }}>
          {label}
        </label>
      </span>
      {help && (
        <span id={helpId} style={helpStyle}>
          {help}
        </span>
      )}
    </div>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  help,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  rows?: number;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-describedby={help ? helpId : undefined}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "var(--white)",
          border: "2px solid var(--line)",
          borderRadius: "var(--radius-md)",
          padding: "14px 20px",
          font: "var(--text-body)",
          color: "var(--ink)",
          outline: "none",
          resize: "vertical",
          minHeight: 96,
        }}
      />
      {help && (
        <span id={helpId} style={helpStyle}>
          {help}
        </span>
      )}
    </div>
  );
}
