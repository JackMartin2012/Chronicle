# CHRONICLE — HOW WE WORK (methodology)

## The pipeline
**Stitch (design) → written spec → Fable (build) → screenshot on device → refine.**

1. Design a screen in Google Stitch (visuals only — its exported code is
   web-flavoured and is NEVER used).
2. React to the mock, refine in Stitch until you'd proudly screenshot it.
3. Convert the approved design to a SPEC WITH REAL NUMBERS (exact sizes, weights,
   colours from the theme tokens) — Fable CANNOT see the mocks, so pasting a
   screenshot and saying "make it look like this" gives an interpretation, which
   is exactly how a previous restyle attempt died.
4. Fable builds ONE screen per run, as a new component on a throwaway preview
   route, importing from `constants/chronicleTheme.ts`, touching no existing screen.
5. Screenshot on device, compare to the mock, correct with a short numbered list.

## The Stitch two-round rule (learned the hard way)
Stitch has NO persistent model of a screen — each iteration regenerates from
scratch, so corrections compete and previously-correct elements fall out. Observed:
identical images returned unchanged; a people row where every name became "Km
moved"; sections vanishing. **Max two rounds per screen**: one for structure, one
refinement, then move on. Everything still off goes to the code-notes list (single-
property fixes like case, spacing, sizes are code notes, NOT Stitch iterations).

## Why the earlier restyle failed (the cautionary tale)
A whole-app sweep, executed from a vibe rather than a spec, with no preview →
`git reset --hard` and a lost day. Hence: one screen at a time, commit between
each, spec not screenshot, preview in isolation.

## The theme-tokens-first principle
`constants/chronicleTheme.ts` holds every colour/font/size/spacing value. New
screens reference tokens, never hardcoded numbers — so the app is consistent by
construction and a global change is one line. Built the tokens file BEFORE building
slides so tokens derive from the whole picture, not guessed from slide one.

## The preview-route pattern
Each new component gets a throwaway `app/*-preview.tsx` route and a temp redirect
in `_layout.tsx` points at whichever is under review. This keeps everything
isolated and revertible — the working app is never at risk. To view a specific
component, ask Fable to point the redirect at its preview route.

## Fable / Claude Code interaction notes (for a non-coder)
- Commands prefixed with `!` in the Claude Code prompt run in YOUR terminal so you
  can type passwords interactively. Fable can't type your Expo password or Apple
  2FA — those are always your steps.
- Fable holds before running builds/destructive things so you can confirm.
- "Presentation only, sample data, don't wire to storage/camera yet, don't modify
  existing screens" is the standard safety phrasing.
- Warnings (deprecations, version-compat nudges) are not errors — the server still
  starts. Only stop for actual errors.

## Expectation about fidelity
Mock → build is never pixel-identical and shouldn't be. Stitch renders web type at
arbitrary sizes with stock photos; the real thing has real photos, iOS font
rendering, a real safe area. What transfers is HIERARCHY, SPACING RHYTHM, and
RESTRAINT — that's what reads as premium. Some screens (e.g. the Today mosaic, the
sound slide's glow) look BETTER on device than in the mock; some (calm screens)
undersell in a static mock and only come alive in motion.

## The user's working preferences
- Decisions explained BEFORE prompts are written; understands the "why", not just
  outputs.
- One step at a time, screenshots between rounds.
- Strong aesthetic instincts — trusts them (rejected several "correct but tacky"
  directions; the pushback was right every time). When Jack says "this looks shit",
  diagnose the root cause, don't just tweak.
- Frustrated by the same fix attempted repeatedly without diagnosing root cause.
- Is NOT a coder — explain terminal/build/jargon plainly, translate Fable's output.
