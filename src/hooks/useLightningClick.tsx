"use client";
import React, { useState, useEffect, useCallback } from "react";
import { BoltFlash, type BoltSize, type BoltPosition } from "@/components/BoltFlash";

export type { BoltPosition };

export interface UseLightningClickOptions {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: BoltSize;
  disabled?: boolean;
}

export interface UseLightningClickResult {
  handleClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  trigger: (pos?: BoltPosition) => void;
  nonce: number;
  isReducedMotion: boolean;
  position?: BoltPosition;
  bolt: React.ReactNode;
  flash: React.ReactNode;
  glowClass: string;
}

export function checkReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function computeClickPosition(
  e?: React.MouseEvent<HTMLElement> | null
): BoltPosition | undefined {
  if (!e) return undefined;

  let rect = { left: 0, top: 0, width: 0, height: 0 };
  if (e.currentTarget && typeof e.currentTarget.getBoundingClientRect === "function") {
    rect = e.currentTarget.getBoundingClientRect();
  }

  // Keyboard fallback: native keyboard-triggered click events report clientX === 0 && clientY === 0
  if (e.clientX === 0 && e.clientY === 0) {
    return {
      x: rect.width / 2,
      y: rect.height / 2,
    };
  }

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export interface LightningClickState {
  nonce: number;
  isReducedMotion: boolean;
  position?: BoltPosition;
}

export function createLightningClickController({
  onClick,
  size = "md",
  disabled = false,
  onStateChange,
}: {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: BoltSize;
  disabled?: boolean;
  onStateChange?: (state: LightningClickState) => void;
} = {}) {
  let nonce = 0;
  let isReducedMotion = checkReducedMotion();
  let position: BoltPosition | undefined = undefined;

  const trigger = (pos?: BoltPosition) => {
    if (disabled) return;
    isReducedMotion = checkReducedMotion();
    if (pos) position = pos;
    nonce += 1;
    onStateChange?.({ nonce, isReducedMotion, position });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const pos = computeClickPosition(e);
    if (pos) position = pos;
    trigger(pos);
    onClick?.(e);
  };

  const getBolt = () => {
    return nonce > 0 ? (
      <BoltFlash
        key={nonce}
        nonce={nonce}
        size={size}
        isReducedMotion={isReducedMotion}
        position={position}
      />
    ) : null;
  };

  const getFlash = () => {
    return nonce > 0 ? (
      <span
        key={nonce}
        className={`adig-flash${isReducedMotion ? " adig-flash--static" : ""}`}
        aria-hidden="true"
      />
    ) : null;
  };

  const getGlowClass = () => {
    return nonce > 0 && !isReducedMotion
      ? nonce % 2 === 1
        ? "adig-glow-pulse"
        : "adig-glow-pulse-alt"
      : "";
  };

  return {
    handleClick,
    trigger,
    getNonce: () => nonce,
    getIsReducedMotion: () => isReducedMotion,
    getPosition: () => position,
    getBolt,
    getFlash,
    getGlowClass,
  };
}

export function useLightningClick({
  onClick,
  size = "md",
  disabled = false,
}: UseLightningClickOptions = {}): UseLightningClickResult {
  const [nonce, setNonce] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(checkReducedMotion);
  const [position, setPosition] = useState<BoltPosition | undefined>(undefined);

  useEffect(() => {
    setIsReducedMotion(checkReducedMotion());
  }, []);

  const trigger = useCallback(
    (pos?: BoltPosition) => {
      if (disabled) return;
      setIsReducedMotion(checkReducedMotion());
      if (pos) {
        setPosition(pos);
      }
      setNonce((prev) => prev + 1);
    },
    [disabled]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const pos = computeClickPosition(e);
      if (pos) {
        setPosition(pos);
      }
      trigger(pos);
      onClick?.(e);
    },
    [disabled, onClick, trigger]
  );

  const bolt =
    nonce > 0 ? (
      <BoltFlash
        key={nonce}
        nonce={nonce}
        size={size}
        isReducedMotion={isReducedMotion}
        position={position}
      />
    ) : null;

  const flash =
    nonce > 0 ? (
      <span
        key={nonce}
        className={`adig-flash${isReducedMotion ? " adig-flash--static" : ""}`}
        aria-hidden="true"
      />
    ) : null;

  const glowClass =
    nonce > 0 && !isReducedMotion
      ? nonce % 2 === 1
        ? "adig-glow-pulse"
        : "adig-glow-pulse-alt"
      : "";

  return {
    handleClick,
    trigger,
    nonce,
    isReducedMotion,
    position,
    bolt,
    flash,
    glowClass,
  };
}

export default useLightningClick;
