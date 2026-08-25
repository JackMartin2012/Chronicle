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

---

## LESSONS ADDED (August 2026 — the editor build sessions)

### The two-round Stitch rule was proven again, twice
- Asked to tighten the Sound editor's spacing, Stitch **returned the identical
  image unchanged** — same 220px art, same caps label, same cut-off rating. A
  third round would have burned another turn for the same result. We stopped,
  moved the remaining fixes to the spec, and let Fable resolve them.
- A later retry of the same screen DID work. So the rule isn't "Stitch can't do
  it" — it's "don't iterate more than twice in a row; bank what's approved and
  move on."

### Batching: one at a time, with two deliberate exceptions
Jack asked to run all eight editors in a single Fable prompt. Pushed back, because
that's the same shape as the full-app restyle that ended in `git reset --hard`:
if run six goes wrong you can't tell whether it's that editor's spec, a bad
assumption inherited from run two, or accumulated drift — and there's no clean
commit between them.

**The pattern that worked instead:**
1. Build the FIRST editor alone. Its chrome becomes the shared pattern.
2. Then batch only the genuinely similar, low-risk ones (Learned + Future You;
   People + Places) — they can say "same chrome as `SoundEditor.tsx`" instead of
   respecifying every pixel and hoping it lands identically.
3. Keep anything touching the camera or microphone SOLO. Always.

**Why the first build matters most:** half the decisions this session were only
gettable by *looking* — the fill-gauge rating pills, the purple whisper, the
selfie inset, the serif journal. Batching would have meant screenshotting eight
finished screens and correcting backwards.

### Design decisions that came from device review, not mocks
- The Sound sheet sized itself to its content, so it hugged the bottom third when
  empty. Fixed height + pinned footer fixed it. **A static mock cannot reveal
  this** — only the empty state on a real device does.
- Empty middle space is a recurring failure mode across editors. Quiet empty
  states (faint icon + one line) fix it.
- The keyboard trapped the user with Done hidden behind it. Every editor with a
  text input needs the dismissal pattern (see 08).

### When a fix "doesn't look right", diagnose the root cause
The Sound editor's real problem wasn't a caps label or a stray margin — it was
that the hero art was too large for what it had to share the sheet with, which
pushed the rating below the fold and left the art floating. Shrinking the art
fixed four symptoms at once. Tweaking the symptoms would have fixed none.

### Working format (confirmed preference — always follow)
- **All terminal commands, Stitch prompts, and Fable prompts go in code blocks**,
  each with a plain-English explanation of what it does. Jack is not a coder.
- Explain the reasoning and the trade-offs BEFORE writing the prompt.
- Stitch prompts must be written as CONTINUATIONS of the existing Chronicle
  session (which already knows the app's design language), never as briefs for a
  new app. A prompt that reintroduces the colours and fonts from scratch produces
  a screen that looks like it belongs to a different product.
