# CHRONICLE — DESIGN SYSTEM

## The core problem this overhaul solves
Chronicle's previous UI was immediately recognisable as AI-generated. Commercially
this matters: if the app looks like something anyone could regenerate in an
afternoon, it has no defensibility and no premium feel.

**Diagnosis.** AI-generated UI treats all content identically — every section
becomes a bordered card of the same size and radius, every label becomes tracked
ALL-CAPS, every icon becomes an emoji, the accent colour appears on every border
and pill. Uniform, templated, characterless.

## THE GOVERNING RULE
> **Every slide is a physical object.**

The slides that felt premium each had ONE dominant physical thing: a globe, a
polaroid, an album cover in a stereo, a newspaper page, a BeReal photo pair, a
ruled notebook page. The slides that felt "boring" or "AI-made" were pure
typography or generic boxes with no object.

Corollaries:
- **De-AI never meant "make it plain."** Plainness produced the worst screens of
  the overhaul. It meant *stop using generic UI containers*. A distinctive
  physical object is the opposite of a generic box.
- **One dominant element per slide/screen.** Screens that failed repeatedly had
  four competing elements. Screens with a single hero worked first time.
  (Proven again with the Capture editor: an early version made the selfie a big
  standalone hero with the main photo as a second block — two photo areas
  fighting. Making it a single BeReal pair fixed it instantly.)
- **Boxes are allowed where they do real work** (year cards, calendar cells, the
  featured polaroid, editor inputs) — but not as the default wrapper.

## The two worlds (most important structural rule)

| | Your Past | Your Present |
|---|---|---|
| Background | `#17102a` (purple-black) | `#0b1526` (blue-black) |
| Card surface | `#1e1636` | `#101c33` |
| Accent | `#9b72ff` (purple) | `#4a90d9` (blue) |
| Typeface | Fraunces (editorial serif) | Space Grotesk (geometric) |
| Mood | Retro, nostalgic, a rewind | Modern, crisp, slightly futuristic |

### Shared
- **Capsule gold `#f5c842` — Future Capsules ONLY. Never anywhere else, ever.**
  (Watch for this: "future" concepts tempt gold. The For-Future-You editor is a
  Present-world feature and stays BLUE.)
- Text: white / `rgba(255,255,255,0.7)` secondary / `rgba(255,255,255,0.4)` muted /
  `rgba(255,255,255,0.25)` faint
- Hairline divider: `rgba(255,255,255,0.08)`
- Subtle ring: `rgba(255,255,255,0.15)`
- Editor input surface: `#16233d` (search fields, note fields, toggle track)

### Fonts loaded (confirmed)
- Fraunces: 300 / 400 / 600 / 700 / 800
- Space Grotesk: 300 / 400 / 600 / 700
- Caveat 400 (handwriting — diegetic use only)
- All loaded once in root `app/_layout.tsx`.

## Layout & styling rules
1. Structure comes from whitespace and hairlines, not bordered cards
2. Photos are full-bleed with text on gradient scrims, never boxed off
3. Details are label-left / value-right rows or plain rows, not tile grids
4. **Sentence case everywhere.** Never tracked ALL-CAPS in UI chrome. (Stitch
   reverts to caps constantly — always a code-note fix, never a re-run.)
5. Accent colour appears 3–4 times per screen maximum — UNLESS an ambient colour
   (e.g. album-art glow) carries the warmth, in which case the budget bends
6. Thin-line vector icons (Ionicons). Emoji only as user content (mood), never as
   an icon system
7. Flat solid buttons. No gradients, glows, or decorative shadows
8. Every element type gets bespoke treatment — a mood, a map, a photo, a person
   should not look alike
9. Designs imply motion. The life comes from micro-interactions, NOT decoration.

## Diegetic exceptions (deliberate — now FOUR)
Font/case rules apply to UI chrome. Printed objects may look like themselves:
1. **Polaroid captions** — handwriting (Caveat), because *you* wrote on the photo
2. **Newspaper masthead & headlines** — serif (Fraunces), because mastheads are serif
3. **Passport page** — tracked caps, because passports are set that way
4. **Journal body text (Story editor + Story slide) — serif (Fraunces)**, because
   it is your own handwritten personal writing, not UI. *(Added Aug 2026.)*

**The boundary on #4 is strict:** serif applies ONLY to the journal entry text
itself. The screen's chrome — title, "Record a voice note", completion line,
buttons, labels — stays Space Grotesk. Serif is the writing on the page, never
the furniture around it. The Story SLIDE must use the same serif for its body so
the written day looks identical in editor and card.

If any exception leaks into UI chrome, it becomes a gimmick.

## Reference apps (tone & quality, not copying)
- **Flighty** (esp. Flighty Passport) — the north star. Cozy but premium.
- **Retro, Apple Journal, Darkroom** — restraint as premium
- **Poolsuite FM** — skeuomorphic device feel (soundtrack slide)
- **BeReal** — the front+back photo pair (capture slide + capture editor)
- **Superlist** — tagging chips
- **Polarsteps** — map/route feel (slide 7, later)

## The theme tokens file
`constants/chronicleTheme.ts` is the single source of truth for colour, type,
spacing, radii, sizes, motion. New code imports via `getWorld(world)` plus named
exports (`palette`, `space`, `type`, `sizes`, `motion`, `dim`). Also contains
`weatherGlow` / `weatherFromTemp` for the weather-reactive globe.

Separate from the Expo-template `constants/theme.ts` (two template files import
`Colors` from it — leave alone).

No big-bang colour migration: old hardcoded colours stay until a file is edited
anyway. New code uses tokens from the start.

### Known token conflict to resolve later
`type.caption` (12pt) and `type.micro` (11pt) fall below the theme's own
`FRAUNCES_MIN_SIZE = 13`. Irrelevant in the Present (Space Grotesk), but when the
PAST variants are built, Past must override caption/micro to 13pt rather than
lowering the floor. A comment in the theme file flags this.
