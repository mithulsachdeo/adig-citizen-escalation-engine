"use client";
import React, { useId } from "react";

// Addendum §2: every input has a VISIBLE <label> tied via htmlFor/id (not placeholder-as-label);
// errors are text + icon tied via aria-describedby, never color-only.
export function Input({
  label,
  placeholder,
  unit,
  value,
  onChange,
  type = "text",
  inputMode,
  error,
  required,
}: {
  label: string;
  placeholder?: string;
  unit?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        htmlFor={id}
        style={{ font: "var(--text-small)", fontWeight: 600, color: "var(--ink-soft)" }}
      >
        {label}
        {required && <span aria-hidden="true" style={{ color: "var(--accent-coral)" }}> *</span>}
      </label>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--white)",
          border: `2px solid ${error ? "var(--severity-high)" : "var(--line)"}`,
          borderRadius: "var(--radius-md)",
          padding: "14px 20px",
          gap: 8,
          minHeight: 48,
        }}
      >
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            font: "var(--text-body)",
            color: "var(--ink)",
          }}
        />
        {unit && (
          <span aria-hidden="true" style={{ color: "var(--ink-faint)", font: "var(--text-small)" }}>
            {unit}
          </span>
        )}
      </span>
      {error && (
        <span
          id={errId}
          style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--text-small)", color: "var(--severity-high)" }}
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </span>
      )}
    </div>
  );
}
