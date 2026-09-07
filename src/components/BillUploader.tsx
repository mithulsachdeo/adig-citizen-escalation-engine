"use client";
import React, { useState, useRef } from "react";
import { useT } from "@/i18n/context";
import { analytics } from "@/lib/analytics";
import type { ExtractedBill, ExtractionProgress } from "@/lib/billExtract/types";

interface BillUploaderProps {
  onExtracted: (extracted: ExtractedBill) => void;
}

export function BillUploader({ onExtracted }: BillUploaderProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [progress, setProgress] = useState<ExtractionProgress>({
    percent: 0,
    stage: "validating",
  });
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [extractedCount, setExtractedCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleProcessFile = async (file: File) => {
    setStatus("processing");
    setErrorCode(null);
    setProgress({ percent: 5, stage: "validating" });

    try {
      analytics.billUploadStarted();
    } catch {
      /* analytics must never break the flow */
    }

    try {
      // Dynamic import to keep heavy OCR/PDF libraries strictly code-split
      const { extractBill } = await import("@/lib/billExtract");

      const result = await extractBill(file, (p) => {
        setProgress(p);
      });

      setStatus("success");
      setExtractedCount(result.fieldsFilled);

      try {
        analytics.extractionCompleted(result.source, result.fieldsFilled, result.confidence);
      } catch {
        /* analytics must never break the flow */
      }

      onExtracted(result);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "unknown";
      setStatus("error");
      setErrorCode(code);

      try {
        analytics.extractionFailed(code);
      } catch {
        /* analytics must never break the flow */
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleProcessFile(file);
    }
    // reset input so selecting the same file triggers change again if needed
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const getErrorMessage = (code: string | null): string => {
    switch (code) {
      case "not_msedcl":
        return t("upload.errorNotMsedcl");
      case "file_too_large":
        return t("upload.errorTooLarge");
      case "unsupported_type":
        return t("upload.errorInvalidType");
      case "empty_text":
      case "ocr_failed":
        return t("upload.errorUnreadable");
      default:
        return t("upload.errorGeneric");
    }
  };

  const getProgressMessage = (): string => {
    switch (progress.stage) {
      case "validating":
        return t("upload.validating");
      case "rendering":
        return t("upload.rendering");
      case "downloading_ocr":
        return t("upload.downloadingOcr");
      case "recognizing":
        return t("upload.recognizing");
      default:
        return t("upload.recognizing");
    }
  };

  return (
    <div
      className="adig-bill-uploader"
      style={{
        marginBottom: "1.5rem",
        border: isDragOver ? "2px dashed var(--brand-primary, #0284c7)" : "1px dashed var(--border-base, #cbd5e1)",
        borderRadius: "8px",
        padding: "1.25rem",
        background: isDragOver ? "var(--surface-subtle, #f0fdf4)" : "var(--surface-card, #f8fafc)",
        transition: "border-color 0.2s, background-color 0.2s",
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.heic,image/*,application/pdf"
        style={{ display: "none" }}
        onChange={onFileInputChange}
        aria-label={t("upload.cta")}
      />

      {status === "idle" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink-base, #1e293b)", marginBottom: "0.25rem" }}>
            📄 {t("upload.title")}
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-faint, #64748b)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
            {t("upload.subtitle")}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="adig-btn-upload"
              style={{
                background: "var(--brand-primary, #0284c7)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0.45rem 0.9rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("upload.cta")}
            </button>
            <span style={{ fontSize: "0.78rem", color: "var(--ink-faint, #64748b)" }}>
              {t("upload.formats")}
            </span>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div style={{ textAlign: "center", padding: "0.5rem 0" }} aria-live="polite">
          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink-base, #1e293b)", marginBottom: "0.5rem" }}>
            {getProgressMessage()} ({progress.percent}%)
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: "280px",
              height: "6px",
              backgroundColor: "var(--border-subtle, #e2e8f0)",
              borderRadius: "999px",
              margin: "0 auto",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress.percent}%`,
                height: "100%",
                backgroundColor: "var(--brand-primary, #0284c7)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {status === "success" && (
        <div style={{ textAlign: "center" }} aria-live="polite">
          <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
            ✓ {t("upload.successAlert").replace("{count}", String(extractedCount))}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--brand-primary, #0284c7)",
              fontSize: "0.8rem",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {t("upload.cta")}
          </button>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center" }} aria-live="polite">
          <div style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "0.5rem", lineHeight: 1.4 }}>
            ⚠️ {getErrorMessage(errorCode)}
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setErrorCode(null);
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--border-base, #cbd5e1)",
              borderRadius: "4px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.8rem",
              color: "var(--ink-base, #1e293b)",
              cursor: "pointer",
            }}
          >
            {t("upload.cta")}
          </button>
        </div>
      )}
    </div>
  );
}
