"use client";
import React from "react";

export type BoltSize = "sm" | "md" | "lg";

export interface BoltPosition {
  x: number;
  y: number;
}

export interface BoltFlashProps {
  nonce: number;
  size?: BoltSize;
  isReducedMotion?: boolean;
  position?: BoltPosition;
}

export function BoltFlash({
  nonce,
  size = "md",
  isReducedMotion = false,
  position,
}: BoltFlashProps) {
  if (nonce <= 0) return null;

  const left = position !== undefined ? `${position.x}px` : "50%";
  const top = position !== undefined ? `${position.y}px` : "50%";

  return (
    <span
      key={nonce}
      className="adig-zap-wrap"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <svg
        className={`adig-zap adig-zap--${size}${isReducedMotion ? " adig-zap--static" : ""}`}
        viewBox="0 0 100 100"
        width={40}
        height={40}
        aria-hidden="true"
        pointerEvents="none"
        data-reduced-motion={isReducedMotion ? "true" : "false"}
        data-size={size}
        data-nonce={nonce}
        style={{
          left,
          top,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <path pathLength={1} d="M64 6 L40 46 L56 46 L36 94" />
      </svg>
    </span>
  );
}

export default BoltFlash;
