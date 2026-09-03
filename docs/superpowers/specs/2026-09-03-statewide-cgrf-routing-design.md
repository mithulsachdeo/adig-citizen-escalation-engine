# Statewide CGRF routing + circle picker — design

**Date:** 2026-09-03
**Status:** proposed (awaiting sign-off)
**Branch:** to be created off `master` (after the i18n branch is merged/parked)
**Source of truth:** MSEDCL official *CGRF Addresses (English), Feb 2024* —
https://www.mahadiscom.in/consumer/wp-content/uploads/2024/02/CGRF-Addresses_English.pdf

## Problem

The CGRF tier (tier 2) resolves a jurisdictional forum from the citizen's MSEDCL circle.
Today only **4 circles** (Pune ×3, Baramati) map to a named forum; every other circle — and the
brittle free-text field itself — falls to a generic "find your forum" card with no address. So for
most of Maharashtra the tool can diagnose and calculate, but can't name the CGRF.

## What we're building

1. **Statewide CGRF data** — all **11 official CGRFs** (name, address, email, phone where published,
   timeline), each `verified` from the primary source above.
2. **A ~45-circle → forum map** covering the full MSEDCL area (circle-wise jurisdiction, verbatim
   from the PDF).
3. **A circle dropdown** replacing the free-text field (the only reliable input), with a
   "Not sure / other" option.
4. **Just-in-time capture** — circle stays optional at intake; if the citizen reaches the CGRF tier
   without one, the guidance step asks for it inline before showing the forum.
5. **Actionable generic fallback** — when circle is "Not sure / other" or unmapped, the card links to
   the official MSEDCL CGRF list so the citizen can self-serve.

## Out of scope (deliberate, deferred)

- **Electricity Ombudsman statewide routing.** Tier 3 still routes to Mumbai. MERC runs regional
  Ombudsman offices, so this is the next weak link — flagged as the top follow-up, not built here.
- **Marathi circle-name translation.** Circle names are proper nouns, kept in Latin script for v1
  (official forms are English anyway). The "Not sure / other" label is translated.

## The 11 forums and their circles (verbatim from the 2024 PDF)

| Forum | Address (short) | Circles covered |
|---|---|---|
| Bhandup | Vidhyut, Ground floor, L.B.S. Marg, Near Asian Paint, Bhandup, Mumbai-400078 · cgrfbhandupz@gmail.com | Vashi, Bhiwandi, Thane |
| Kolhapur | Adm. Bldg., Tarabai Park, Kolhapur-416003 · cgrfkolhapur@gmail.com | Kolhapur, Sangli, Ratnagiri, Sindhudurg |
| Nashik | Type II Quarter No.3, 1st floor, Vidyut Bhavan Premises, Bytco Point, Nashik Road-422101 · cgrfnsk@rediffmail.com | Nashik (U), Malegaon, Ahmednagar, Jalgaon, Nandurbar, Dhule |
| Chh. Sambhaji Nagar | Vidhyut Bhawan, Dr. Babasaheb Ambedkar Marg, CSN-431001 · 0240-2334065 · cgrfaz11@gmail.com | Jalna, CSN (U), CSN (R), Latur, Beed, Osmanabad, Hingoli, Parbhani, Nanded |
| Amravati | Vidyut Bhawan, Shivaji Nagar, Camp Area, Amravati-444603 · eecgrfamtz@gmail.com | Amravati, Yavatmal |
| Pune | 925, Kasaba Peth, Administrative Building, 2nd floor, Pune-411011 · 020-24570520 · cgrfpune@gmail.com | Pune (R), Ganeshkhind, Rastapeth |
| Nagpur | Prakash Bhawan, Link Road, Gaddi Gudam, Sadar, Nagpur-440001 · cgrfnagpurzone@gmail.com | Nagpur (R), Nagpur (U), Wardha, Chandrapur, Gadchiroli, Gondia, Bhandara |
| Kalyan | Behind Tejashree Bldg., Jahangir Maidan, Karnik Road, Kalyan-421301 · cgrfkalyan@yahoo.co.in | Kalyan-I, Kalyan-II, Pen |
| Baramati | "URJA BHAVAN", Bhigwan Road, Baramati-413102 · cgrfbaramati1@gmail.com | Baramati, Satara, Solapur |
| Akola | Vidyut Bhawan, Ratanlal Plot, Ground Floor, Durga Chowk, Akola-444005 · cgrfakola@gmail.com | Buldhana, Washim, Akola |
| Vasai | Bldg. No. 18, Flat No.5, 2nd Floor, MSEB Colony, Navghar, Dist. Palghar, Vasai East-401202 · cgrfvasai@gmail.com | Vasai, Palghar |

## Architecture

### Data (single source of truth) — `src/engine/routing/`
- Define the 11 forums as `Routing` objects (confidence `verified`, `verifyAtSource: true` retained —
  the standing "confirm before sending" flag every tier has). Emails from the 2024 list are added as
  `contact` (this supersedes the earlier omission, which was due to a stale conflicting list; the 2024
  list is now the authority).
- A `CIRCLES` array — the one source both the dropdown and the map derive from:
  `{ value, label, forum }` per circle (~45 rows). `CGRF_BY_CIRCLE` is built from it.
- `resolveCgrfRouting(circle)` unchanged in contract: known circle → its forum, unknown/blank →
  `undefined` (caller shows the generic fallback). Dropdown emits canonical keys, so matching is exact.

### Input — intake circle field
- Replace the free-text `Input` with a `SelectField`: ~45 circles (alphabetical) + a "Not sure / other"
  option (empty value → generic fallback). Optional at intake.

### Just-in-time capture — guidance step (tier 2 only)
- If the active instrument is `cgrf-schedule-a` and circle is blank, the CGRF card shows the circle
  picker inline ("Select your circle to see the exact forum") before/above the routing. Picking updates
  routing live. Reuses the same dropdown; requires threading a `setCircle` down to `GuidanceStep`.
- "Not sure / other" is a valid choice → generic fallback card.

### Generic fallback — `CGRF_GENERIC_ROUTING`
- Add an actionable line + link to the official MSEDCL CGRF list. Shown for "Not sure / other" and any
  future unmapped circle.

## Testing
- Routing unit tests: every one of the ~45 circle keys resolves to the expected forum; unknown/blank →
  `undefined`; each of the 11 forums is reachable.
- `tsc --noEmit` + full vitest (dev-server-safe; no `next build` while dev runs).

## Risks
- **Transcription accuracy** — 11 addresses hand-carried from the PDF. Mitigated by small N and a
  second read; all marked `verified` per the owner's call, `verifyAtSource` still prompts a live check.
- **Circle-name recognition** — some circles are metro sub-divisions (Ganeshkhind, Rastapeth, Vashi)
  a citizen may not recognise. Mitigated: circles within a city share one forum, so approximate choice
  still routes correctly; "Not sure / other" + link is the safety net.
- **Ombudsman inconsistency** — deferred (see out-of-scope); tier 3 still Mumbai-only.
