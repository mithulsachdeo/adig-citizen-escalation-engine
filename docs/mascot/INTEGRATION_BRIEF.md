# Mascot Integration Brief — animated SVG mascot (for Antigravity)

**Goal:** Replace the current mascot (static PNGs + a separate simpler vector) with **one** reusable, GSAP-animated SVG component covering four emotions — **neutral, happy, helping, sad** — as a **drop-in** that keeps every existing call-site working.

**Status:** The four mascots are designed, recolored to the brand palette, and approved. This brief is the spec for wiring them into the app. Do this on a **new branch**.

---

## 1. Source of truth (the approved designs)

Four self-contained HTML+GSAP prototypes live in `docs/mascot/reference/`:

- `neutral.html` — calm float, cape sway, blinking, springy hover, jump-zap on click
- `happy.html` — squint+grin, energetic bob, spontaneous sparkles, both-arms jump-for-joy
- `helping.html` — determined brows + hand-on-hip, bolt "charging" (expanding rings), power-up click
- `sad.html` — worried brows + downturned mouth + head tilt, slow float, periodic tear, dimmed/lowered bolt, empathetic shrug

Each file is a **full demo page**. When porting, extract **only**:
1. The `<svg id="mascot-svg" viewBox="0 0 280 360">…</svg>` markup, and
2. The GSAP animation logic inside its `<script>` (entrance, `startAmbient`, hover, click, reduced-motion).

**Discard** the page chrome from each: the `<body>`/root `<div>`, the header (`Adig Mascot` / eyebrow / description), the `#status-text` element and all writes to it, and the background wash `<div>`s. The mascot must render on a **transparent background** — it sits on colored cards in the app.

---

## 2. Component contract (must stay drop-in)

Keep the **exact prop signature** the app already uses so the 3 call-sites don't break:

```tsx
export type MascotExpression = "neutral" | "happy" | "sad" | "helping";
export type MascotReaction = "hop" | "tilt" | "none";

export function Mascot(props: {
  expression: MascotExpression;
  size?: number;          // default 140
  reaction?: MascotReaction; // one-time reveal beat; default "none"
  alt?: string;           // "" ⇒ decorative ⇒ aria-hidden
  spark?: boolean;        // optional, default true
  className?: string;
}): JSX.Element
```

- File: **replace** `src/components/Mascot.tsx` (keep the name + `Mascot` export → existing imports keep working).
- `"use client"` (uses `window`, GSAP).
- **Delete** `src/components/RiggedMascot.tsx` after migration (superseded).

### Behavior to preserve from the current components
- **Reduced motion:** freeze ambient loops, show the correct static expression. (Already implemented in each source via `matchMedia('(prefers-reduced-motion: reduce)')`.)
- **Offscreen pause:** the current components use an `IntersectionObserver` (threshold 0.35) to pause idle loops when offscreen. **Keep this** — gate `startAmbient()` on in-view and kill/resume the looping tweens. It matters for low-end Android battery.
- **Entrance once:** play the entrance the first time it enters view.
- **`reaction` prop:** a one-time emphasis beat played on reveal / whenever it changes to a non-`none` value:
  - `hop` → the celebratory jump/bounce (reuse the happy/neutral click beat)
  - `tilt` → a brief concerned head-tilt (reuse the sad hover/idle tilt)
  - `none` → nothing
  Do **not** drop this prop — `ResultsStep` passes it.

---

## 3. Colors — use CSS tokens, not the hex from the prototypes

The prototypes hardcode hex so they render standalone. In the app, map them to the existing tokens in `src/styles/tokens.css` so the mascot tracks the theme:

| Prototype hex | Token | Element |
|---|---|---|
| `#8ed462` / `#9bdb68`→`#79c247` | `--brand-green` (+ a mid/deep shade) | head disc, body suit, arms |
| `#4a7a2e` | `--brand-green-ink` | body outline, chest emblem circle, deep-green shade |
| `#ef4444` | `--accent-coral` | cape, cheek blush |
| `#2563eb` / `#3b82f6` | `--accent-blue` | legs |
| `#f4c542` / `#eab308` / `#fde047` | `--accent-yellow` | feet, hands, held bolt, chest bolt |
| `#2c2e2a` | `--ink` | eyes, mouth, brows |
| `#fffdf5` | `--canvas-raised` (near-white) | face disc |

Face disc stays a warm near-white; do **not** make the mascot background cream (that was demo-only).

---

## 4. Sizing — preserve aspect ratio (the one gotcha)

The current PNG `Mascot` renders **square** (`width=size height=size`). The new SVG is **280×360 (portrait, 0.78:1)**. If you force it square it will distort.

**Do:** let `size` drive one dimension and derive the other from the viewBox, e.g. height = `size`, width = `size * 280/360` (or keep a fixed `aspect-ratio` on the wrapper and center the SVG). Verify at all three call-site sizes (60, 72, 128) that nothing squashes or clips (the bolt sits high in the viewBox — don't clip the top).

---

## 5. GSAP setup (React 19 / Next 15)

- **Add the dependency:** `npm i gsap` (GSAP 3.x, ~23 KB gz, no plugins needed — core only). Import `{ gsap } from "gsap"`.
- **Lifecycle:** create all tweens inside a `useEffect`, scoped with `gsap.context(() => { … }, rootRef)`; return `ctx.revert()` for cleanup. This prevents leaks across expression changes and unmounts.
- **Expression change:** when `expression` changes, kill the previous emotion's tweens (via the context) and (re)build the new emotion's ambient set on the same SVG. A crossfade between poses is optional polish; a direct swap is acceptable for v1.
- Use `useRef` for the SVG root and named child groups (`#the-bolt`, `#cape`, `#head-group`, `#arm-right`, eyes, etc. — ids already present in each source).
- Keep the sparkle/charge-ring/tear helpers from the sources; they append/remove SVG children — parent them to the component's own SVG, not `document`.

---

## 6. Call-site changes (emotion→moment mapping already exists — keep it)

**`src/app/check/ResultsStep.tsx`** — no logic change; the mapping already picks the right expression + reaction:
```tsx
// line ~8  (unchanged import — new component keeps the name)
import { Mascot, type MascotExpression, type MascotReaction } from "@/components/Mascot";
// line ~164 (unchanged mapping)
const mascotExpression = relieved ? "happy" : rallying ? "helping" : "neutral";
const mascotReaction   = relieved ? "hop"   : rallying ? "tilt"    : "none";
// line ~174 (unchanged usage)
<Mascot expression={mascotExpression} reaction={mascotReaction} size={60} />
```

**`src/app/page.tsx`** — two edits (remove the RiggedMascot path):
```tsx
// line 6/7: keep the Mascot import, DELETE the RiggedMascot import
import { Mascot } from "@/components/Mascot";
// (remove) import { RiggedMascot } from "@/components/RiggedMascot";

// line ~69: unchanged
<Mascot expression="sad" size={72} alt="" />

// line ~153: was <RiggedMascot expression="helping" size={128} />  → now:
<Mascot expression="helping" size={128} />
```

---

## 7. Cleanup / removal

- Delete `src/components/RiggedMascot.tsx`.
- Delete the four PNGs in `public/mascot/` (`mascot-neutral/happy/sad/helping.png`, ~2.8 MB) once the SVG component is confirmed working everywhere. (Skip if you want a fallback; not needed — the SVG is self-contained.)
- Remove any now-unused `.adig-mascot*` PNG-crossfade CSS in `globals.css` that the new component no longer uses. **Check first** — keep `.adig-mascot` wrapper rules if the new component still relies on them; only remove the image/crossfade-specific ones.

---

## 8. Verify before merge (evidence, not vibes)

1. `npx tsc --noEmit` clean.
2. `npm run build` clean.
3. `npm test` — the existing **139 tests** still pass. Note `src/hooks/useLightningClick.test.tsx` exists; make sure nothing mascot-adjacent breaks.
4. Manual: each of the 4 states renders at sizes 60/72/128 without distortion or clipping; hover + click behave; `prefers-reduced-motion` (OS setting) freezes ambient motion to a correct static pose; offscreen mascots don't animate.
5. Confirm the landing (`sad` + `helping`) and Results (`happy`/`helping`/`neutral` + hop/tilt) still fire the right emotion at the right moment.

---

## 9. Notes / decisions already made

- **Character:** the caped-hero silhouette, **recolored to the brand palette** (green body, coral cape, blue legs, yellow bolt). This intentionally supersedes both the old PNG everyman and `RiggedMascot`.
- **Animation tech:** **GSAP** (decided — fastest, keeps fidelity). If GSAP is later deemed unwanted, the same motion can be re-authored in CSS/Web Animations, but that is out of scope here.
- **Known minor nit (optional polish):** on `happy`/`helping` the raised hand-circle and the bolt sit slightly apart (inherited geometry). Cosmetic; fix by nudging the bolt path / hand circle together if desired.
