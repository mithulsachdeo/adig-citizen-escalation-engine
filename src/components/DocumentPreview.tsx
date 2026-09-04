import React from "react";

// design.md: the one "serious" component — sharp frame, monospace, official register.
// Addendum §1 badge slot (top-right) + §4 print: className "document-preview" is the print anchor.
export interface DocumentPreviewProps {
  title: string;
  badge?: React.ReactNode;
  /** When true, a plain-text "DRAFT" line prints inside the letter so a printed draft can't be
   *  mistaken for a final copy — independent of the badge's color chip (addendum §4). */
  draft?: boolean;
  children: React.ReactNode;
}

export const DocumentPreview = React.forwardRef<HTMLDivElement, DocumentPreviewProps>(
  function DocumentPreview({ title, badge, draft = false, children }, ref) {
    return (
      <div
        ref={ref}
        className="document-preview"
      style={{
        background: "var(--white)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-raised)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "2px solid var(--ink)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ font: "var(--text-h3)", color: "var(--ink)" }}>{title}</span>
        {badge}
      </div>
      {draft && (
        <div
          className="document-preview-draft-mark"
          style={{
            padding: "10px 24px",
            font: "var(--text-small)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--badge-draft-ink)",
            background: "var(--badge-draft-bg)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          DRAFT — confirm before sending
        </div>
      )}
      <div
        style={{
          padding: "24px",
          font: "var(--text-body)",
          color: "var(--ink)",
          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          // addendum §3: readable at 360px — scroll inside the frame, don't shrink type
          overflowX: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
});

DocumentPreview.displayName = "DocumentPreview";
