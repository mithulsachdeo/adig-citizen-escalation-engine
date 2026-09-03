# Marathi UI language support (runtime switcher) — design

**Date:** 2026-09-03
**Status:** proposed (awaiting sign-off)
**Scope owner:** Mithul Sachdeo
**Context:** Adig / Citizen Escalation Engine. Submission 2026-09-06.

## Goal

Let a user switch the **interface** language between English and Marathi at
runtime, via a header toggle. The i18n *seam* (`t()`, `en.ts`, `Language`
type) already exists; this work makes it **runtime-reactive**, wires the
currently-hardcoded surfaces through it, and adds a **beta-marked** Marathi
table.

## In scope

- Runtime language state (EN default) with a header toggle, persisted to
  `localStorage`.
- Full **UI chrome** coverage: landing page, header, footer, and the entire
  check flow toggle between EN and MR.
- A machine-drafted `mr.ts` table, clearly marked **beta / unreviewed**.
- Honesty note on the documents step (MR mode): the generated legal
  instrument stays English.

## Out of scope (deliberate)

- **Translating generated legal documents.** They remain English, verbatim
  from the verification pass. Marathi legal instruments need accurate
  translation + re-verification — a post-submission fast-follow, gated on the
  society survey.
- **Hindi / any third language.** The architecture stays extensible (new
  table + one `TABLES` entry) but v1 ships Marathi only.
- **Auto-detection** from `Accept-Language`. EN default, manual toggle only.
- **Input translation.** Already handled — the caged LLM normalizes any-language
  free text to English.

## Architecture

### Runtime language state
- New client `LanguageProvider` (React Context) holds `{ lang, setLang }`.
  Mounted in `layout.tsx` wrapping all children.
- Default `en`. On mount (client only), read `localStorage["adig.lang"]`;
  `setLang` writes it back. Store-nothing-compatible — same local-only pattern
  as the resume flow; no server, no PII.
- New `useT()` hook returns a `t` bound to the active language:
  `const t = useT(); t("common.back")`. Re-renders on switch.
- Keep the standalone `t(key, lang)` for tests and any non-React call. `useT()`
  is a thin wrapper: `const { lang } = useLanguage(); return (k) => t(k, lang)`.

### Client-boundary conversion (the main cost)
The landing page, `Header`, and `Footer` are Server Components. To consume
`useT()` they must become Client Components (`"use client"`). They are purely
presentational (no server data fetching), so the conversion is low-risk. Trade-off:
their first paint moves client-side. Acceptable — the app already ships a
serverless narrative route and is interaction-heavy; SEO of the marketing page is
not a v1 priority.

### The switcher
- Lives in the header (`Header.tsx`), right-aligned opposite the wordmark.
- Two options: **EN** / **मराठी (बीटा)**. Active state visually marked.
- The `(बीटा)` label is always present on the Marathi option (Q9).

### Beta signalling (Q9 = both)
- Toggle option labelled **मराठी (बीटा)**.
- When Marathi is active, a **dismissible** top banner: brief "beta / unreviewed
  translation" note in Marathi. Dismissal persists in `localStorage`
  (`adig.mrBetaDismissed`) so it does not nag on every page.

### Tagline & Sanskrit in Marathi mode (Q7 = a)
- The **ADIG backronym tagline stays English in both modes** (wordmark-style;
  "Adig" is a proper noun and the backronym only works in English).
- The **Sanskrit benediction stays Sanskrit** in both modes (already Devanagari,
  universal).

### Documents honesty note (Q8)
- On the documents step, **only in Marathi mode**, show a short Marathi note:
  the legal document is in English and the forums accept English applications.
  Reassurance, not an error.

## Strings

- `mr.ts` mirrors the `Strings` shape of `en.ts` (compile-time enforced via the
  `Strings` type — a missing key fails typecheck).
- New keys needed beyond today's `en.ts` (landing/header/footer are not yet
  keyed): hero (chip, h1, lead, CTA, sub-CTA), flow steps (labels + descs),
  reassurance (heading, alert title/body), footer, header switcher labels,
  documents English-note, beta banner. Enumerated in the implementation plan.
- All Marathi values machine-drafted, marked beta. Mithul routes them to a
  native reviewer post-build; replacing values is a table edit, no call-site
  change.

## Components touched

- `src/i18n/index.ts` — add `mr` to `TABLES`; export `useT`, `LanguageProvider`,
  `useLanguage` (or a new `src/i18n/context.tsx` for the client pieces).
- `src/i18n/mr.ts` — new, beta.
- `src/app/layout.tsx` — mount `LanguageProvider`.
- `src/components/Header.tsx` — client; switcher; key the tagline area.
- `src/components/Footer.tsx` — client; keyed.
- `src/app/page.tsx` — client; key hero, flow, reassurance.
- `src/app/check/*` — already client; swap bare `t()` for `useT()` and key any
  remaining hardcoded strings (intake/results/documents step labels).
- New `BetaBanner` + documents English-note (small components or inline).

## Testing

- Extend `i18n.test.ts`: `mr` table satisfies `Strings` (no missing keys);
  `t(key, "mr")` returns the MR value; unknown key still falls back to `en` then
  the key.
- A `LanguageProvider` + `useT()` render test: switching lang re-renders a
  consumer.
- `tsc --noEmit` (the `Strings` type is the real guard) + full vitest, per the
  local-build gotchas (no `next build` while dev runs).

## Risks

- **Unreviewed Marathi** in front of judges — mitigated by explicit beta marking
  (toggle label + banner) and EN default.
- **RSC → client conversion** of the landing page — presentational only, low risk;
  the cost is first-paint, not correctness.
- **Time** — 3 days to submission with user-testing pending. This is UI-chrome
  only; documents and reviewed Marathi are explicitly deferred to protect the
  window.
