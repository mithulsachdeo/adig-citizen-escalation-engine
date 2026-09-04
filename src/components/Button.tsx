"use client";
import React from "react";
import { useLightningClick } from "@/hooks/useLightningClick";

type CircleColor = "primary" | "secondary" | "coral" | "blue" | "yellow" | "pink";
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const CIRCLE: Record<CircleColor, string> = {
  primary: "var(--white)",
  secondary: "var(--brand-green)",
  coral: "var(--accent-coral)",
  blue: "var(--accent-blue)",
  yellow: "var(--accent-yellow)",
  pink: "var(--accent-pink)",
};

export function Button({
  children,
  variant = "primary",
  circle = "secondary",
  size = "md",
  onClick,
  disabled,
  type = "button",
  fullWidth,
}: {
  children: React.ReactNode;
  variant?: Variant;
  circle?: CircleColor;
  size?: Size;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  fullWidth?: boolean;
}) {
  const { handleClick, bolt, flash, glowClass } = useLightningClick({ onClick, size, disabled });

  const sizes: Record<Size, { pad: string; font: string }> = {
    sm: { pad: "10px 20px 10px 14px", font: "var(--text-small)" },
    md: { pad: "14px 28px 14px 18px", font: "var(--text-body)" },
    lg: { pad: "18px 36px 18px 22px", font: "var(--text-lead)" },
  };
  const variants: Record<Variant, React.CSSProperties> = {
    primary: { background: "var(--ink)", color: "var(--white)" },
    secondary: { background: "var(--white)", color: "var(--ink)", border: "2px solid var(--line)" },
    ghost: { background: "transparent", color: "var(--ink)", border: "2px solid var(--brand-green)" },
  };
  const s = sizes[size];
  const v = variants[variant];
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`adig-btn-squish ${glowClass}`.trim()}
      style={{
        position: "relative",
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : undefined,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        padding: s.pad,
        font: s.font,
        fontWeight: 600,
        minHeight: 48, // addendum §2: 48px thumb target
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...v,
      }}
    >
      {flash}
      {bolt}
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: CIRCLE[circle],
          flexShrink: 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </button>
  );
}
