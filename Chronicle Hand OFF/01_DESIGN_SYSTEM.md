# CHRONICLE — DESIGN SYSTEM

## The core problem this overhaul solves
Chronicle's previous UI was immediately recognisable as AI-generated. Commercially
this matters: if the app looks like something anyone could regenerate in an
afternoon, it has no defensibility and no premium feel. A "38-0 app" and the old
Chronicle screenshots both read as distinctly Claude/AI-made.

**Diagnosis.** AI-generated UI treats all content identically — every section
becomes a bordered card of the same size and radius, every label becomes tracked
ALL-CAPS, every icon becomes an emoji, the accent colour appears on every border
and pill. Uniform, templated, characterless.

## THE GOVERNING RULE
> **Every slide is a physical object.**

The slides that felt premium each had ONE dominant physical thing: a globe, a
polaroid, an album cover in a stereo, a newspaper page, a passport page. The
slides that felt "boring" or "AI-made" were pure typography or generic boxes with
no object.

Corollaries:
- **De-AI never meant "make it plain."** Plainness produced the worst screens of
  the session. It meant *stop using generic UI containers*. A distinctive physical
  object is the opposite of a generic box.
- **One dominant element per slide/screen.** Screens that failed repeatedly had
  four competing elements. Screens with a single hero worked first time.
- **Boxes are allowed where they do real work** (year cards, calendar cells, the
  featured polaroid, editor inputs) — but not as the default wrapper for
  everything.

## The two worlds (most important structural rule)
Chronicle has two halves that must feel like different places.

| | Your Past | Your Present |
|---|---|---|
| Background | `#17102a` (purple-black) | `#0b1526` (blue-black) |
| Card surface | `#1e1636` | `#101c33` |
| Accent | `#9b72ff` (purple) | `#4a90d9` (blue) |
| Typeface | Fraunces (editorial serif) | Space Grotesk (geometric) |
| Mood | Retro, nostalgic, a rewind | Modern, crisp, slightly futuristic |

### Shared
- **Capsule gold `#f5c842` — Future Capsules ONLY. Never anywhere else, ever.**
- Text: white / `rgba(255,255,255,0.7)` secondary / `rgba(255,255,255,0.4)` muted /
  `rgba(255,255,255,0.25)` faint
- Hairline divider: `rgba(255,255,255,0.08)`
- Subtle ring: `rgba(255,255,255,0.15)`

### Fonts actually loaded (confirmed in codebase)
- Fraunces: 300 Light, 400 Regular, 600 SemiBold, 700 Bold, 800 ExtraBold
- Space Grotesk: 300 Light, 400 Regular, 600 SemiBold, 700 Bold
- Caveat 400 (handwriting — diegetic use only)
- **All fonts now loaded once in root `app/_layout.tsx`** (centralised this
  session; screens no longer load their own). This matters because the newspaper
  slide's serif masthead needs Fraunces available even in the Present world.

## Layout & styling rules
1. Structure comes from whitespace and hairlines, not bordered cards
2. Photos are full-bleed with text on gradient scrims, never boxed off
3. Details are label-left / value-right rows or plain rows, not tile grids
4. **Sentence case everywhere.** Never tracked ALL-CAPS in UI chrome. (Stitch
   repeatedly reverted to caps — always a code-note fix.)
5. Accent colour appears 3–4 times per screen maximum — UNLESS an ambient colour
   (e.g. album-art glow) is carrying the warmth, in which case the budget bends
6. Thin-line vector icons (Ionicons). Emoji only as user content (mood), never as
   an icon system
7. Flat solid buttons. No gradients, glows, or decorative shadows
8. Every element type gets bespoke treatment — a mood, a map, a photo, a person
   should not look alike
9. Designs imply motion (progress rings, page dots, subtle depth). The life comes
   from micro-interactions, NOT decoration.

## Diegetic exceptions (deliberate, the ONLY three)
Font/case rules apply to UI chrome. Printed objects may look like themselves:
- **Polaroid captions** — handwriting (Caveat), because *you* wrote on the photo
- **Newspaper masthead & headlines** — serif (Fraunces), because mastheads are serif
- **Passport page** — tracked caps, because passports are set that way

If any exception leaks into UI chrome, it becomes a gimmick.

## Reference apps (for tone & quality, not copying)
- **Flighty** (esp. the Flighty Passport screen) — the north star. Cozy but
  premium. Real personal data presented like a personal artefact. The globe,
  the passport, the stat blocks.
- **Retro, Apple Journal, Darkroom** — restraint as premium
- **Poolsuite FM** — skeuomorphic device feel (informed the soundtrack slide)
- **BeReal** — the front+back photo pair (capture slide)
- **Superlist** — tagging chips (informs the tagging system)
- **Polarsteps** — map/route feel (relevant to the map slide 7, later)

## The theme tokens file
`constants/chronicleTheme.ts` is the single source of truth for colour, type,
spacing, radii, sizes, motion. New code imports from it via `getWorld(world)` plus
named exports (`palette`, `space`, `type`, `sizes`, `motion`, `dim`). It also
contains `weatherGlow` and `weatherFromTemp` helpers for the weather-reactive globe.

NOTE: this is a NEW file, separate from the Expo-template `constants/theme.ts`
which still exists (two template files import `Colors` from it — leave it alone).

There was NO big-bang colour migration — old hardcoded colours (80+ instances)
stay until each file is edited anyway. New code uses tokens from the start.

### Known token conflict to resolve later
`type.caption` (12pt) and `type.micro` (11pt) fall below the theme's own
`FRAUNCES_MIN_SIZE = 13`. Irrelevant in the Present (Space Grotesk), but when the
PAST variants are built, Past must override caption/micro to 13pt rather than
lowering the floor. There's a comment in the theme file flagging this.
