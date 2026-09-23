# CHRONICLE — THE DAY CARD CAROUSEL

A swipeable full-screen carousel that opens when you tap a saved day. Up to 8
slides. Shared chrome (top bar: chevron-down left, share right, centred date +
per-slide subtitle; bottom: page dots + "N of M") persists across slides via
the carousel shell; each slide renders only its body.

> ## ⚠️ UPDATED SEPT 2026 — DATA WIRING PASS STARTED, SEPARATE FROM THE
> ## EDITORS/TODAY WIRING PASS. See "DATA WIRING (Sept 2026)" below for what's
> ## actually real vs sample content — the "Built?" table below predates it and
> ## means "the slide component exists and renders", not "wired to real data".

## The 8/8 ring vs the 8 slides — NOT the same eight
- **The ring counts INPUTS** (things the user fills in).
- **The slides count DISPLAYS** (ways a day is shown).
The cover slide is generated, not filled in. Do not force a 1:1 mapping. (Stitch
and Fable both kept tying editor progress counters to slide positions — wrong.
The counter should reflect the live count of filled inputs.)

## Slide roster & state
| # | Slide | Object | Built? |
|---|---|---|---|
| 1 | Cover | Globe | YES |
| 2 | Today's capture | BeReal photo pair | YES |
| 3 | Your camera roll | Polaroid + thumbnail strip | YES |
| 4 | Three words + mood | Monumental typography | YES |
| 5 | Your day (story) | Dark journal page | YES |
| 6 | Sound & screen | Album art + ambient glow | YES |
| 7 | Who and where | MAP route | NO (Mapbox, deferred) |
| 8 | Beyond today | Newspaper page | YES |

---

## SLIDE 1 — COVER
Globe (real NASA Black Marble image, circular-masked, floating on bg with accent
glow, single pulsing pin). Date hero ("24 July" huge), day-of-week above, year
below. Unboxed metadata row: weather · mood · photo count, dot separators. People
thumbnails + "Spent with Alex, Sam & Mum". Page dots.

**Weather-reactive glow (designed, not fully wired):** the globe's atmosphere glow
modulates by weather — COLOUR TEMPERATURE ONLY, never particles. Hot→amber,
cold→cyan-white, rain→dim/desaturated, snow→pale, mild→accent. The tint BLENDS
with the world accent, never replaces it (or the two worlds converge). Helpers
`weatherGlow` / `weatherFromTemp` exist in the theme. `weatherCondition` prop is
accepted but not yet read.

**Notes:** globe is decorative, not geographically accurate (the map slide does
real geography). Pin sits near upper-right; could nudge inward. Possible faint
horizontal seam in the globe image from the source render.

## SLIDE 2 — TODAY'S CAPTURE
Full-bleed back-camera photo (~70% height) with a small BeReal selfie inset
top-left (thick dark border). "Captured 18:04" beneath.
**Interactions built:** tap the inset to SWAP (selfie becomes big, back-camera
shrinks); press-and-hold anywhere to PEEK (inset hides, clean photo shows;
returns on release). Gestures don't conflict.
**Past variant:** the day's cover photo fills the slot, no selfie inset.

## SLIDE 3 — YOUR CAMERA ROLL
ONE polaroid, centred (~72% width): warm cream frame, thin top/sides, thick
bottom margin with time + HANDWRITING caption (Caveat — the one diegetic
handwriting use). Contains exactly ONE photo (never a grid/collage/screenshot).
Horizontal thumbnail strip beneath; tapping a thumbnail changes the featured
polaroid (so no horizontal swipe is consumed inside the slide — avoids fighting
the carousel). "12 photos · 2 videos" beneath. Video state: play glyph on polaroid
and on video thumbnails.
**Open decision:** polaroid rotation — currently straight; could add subtle 1–2°.

## SLIDE 4 — THREE WORDS
Three words stacked, monumental (Space Grotesk bold). Words that have an
explanation show a small accent DOT beneath (the affordance — a thin underline was
too faint to find). Tap a word → its reason appears beneath, the other two dim to
40%. Mood emoji beneath (a FACE, not weather — weather is on slide 1).
Sample: "Warm" (has reason), "Unhurried" (no reason), "Reunion" (has reason).

## SLIDE 5 — YOUR DAY (STORY)
A single flowing JOURNAL PAGE (dark, NOT cream — a cream page here would clash
with the polaroid and mean two cream slides). Fixed-height panel (~55% screen)
with faint rule lines + a muted-red left margin rule; the entry text scrolls
INTERNALLY within the panel if long; voice memo row pinned at the panel's bottom.
The entry flows as one voice (story + highlight/lowlight woven in as sentences,
NOT labelled fields). Names ("Alex", "Sam") render in accent inline (tap is a
no-op until the people system exists).
**Below the panel, always visible:** the "Something I learned" note as a DISTINCT
pinned object (bordered note, accent-tinted), with "Saved to your things learned"
beneath — the hook for the things-learned bank. The learned fact was PULLED OUT of
the flowing text into this separate section (user preference).
**Code note:** learned text must not be larger than the story (hierarchy was
inverted in an early mock).

## SLIDE 6 — SOUND & SCREEN
Album art centred (~62% width) with an AMBIENT GLOW derived from the artwork's
colours (via `react-native-image-colors` when real art is wired; sample glowColor
for now) — so every song produces a differently-lit slide. Title/artist, thin
progress line, transport controls (prev/play/next), a 1-10 RATING (ten numbered
boxes; filled up to rating; box==rating solid; "8/10" beside; "How it hit" label),
reaction quote, "Apple Music" label.
**Swap:** a quiet bottom row shows the OTHER item (film) as a small dimmed
thumbnail with a swap icon; tapping toggles which is centrepiece.
**CRITICAL — film centrepiece must NOT inherit music controls:** no progress line,
no transport; store label reads "Apple TV" not "Apple Music". (Mock kept getting
this wrong.)
**Code notes:** rating boxes need larger tap targets (44pt hitSlop). Accent budget
is exceeded but acceptable because the ambient glow carries the warmth.
**Input source:** iTunes Search API (free, no key, covers music/podcasts/film/TV,
returns artwork + 30s preview). YouTube/other typed manually with no artwork.

## SLIDE 7 — WHO AND WHERE (NOT BUILT — MAP)
**Final approved design: the map IS the object.** Dark cartographic map (fine
pale-blue line work), full-bleed ~3/4 screen. Three stops as glowing pulsing dots
in visit order, dashed accent route between them, each labelled (name + time +
type glyph). PEOPLE placed on the map at the stop where you were with them (small
circular portraits with rings, clustering with "+N"). Soft gradient fades the
map's bottom. Below: three stats unboxed ("8,432 steps · 6.2 km moved · 3 places"
+ "From Apple Health") and a scrollable row of people portraits with names.

**REJECTED approaches (do NOT retry):** passport page (dark), passport page
(cream paper), notebook page. All failed because paper objects need texture that
renders badly AND the slide had four competing elements. The passport metaphor was
RECLAIMED for TRIPS instead (see 05).

**Needs:** Mapbox (`@rnmapbox/maps`), rendered as a STATIC SNAPSHOT (cheap,
cacheable, offline-safe), dark style (built-in `dark-v11` first, custom Chronicle
style later). Past variant = parchment/sepia map style (an aged hand-inked map =
a place you can't return to — gives the Past its own reason to exist).
Deferred behind Apple Developer enrolment + dev build.

## SLIDE 8 — BEYOND TODAY (NEWSPAPER)
The physical-object thesis's proof: identical content went from the worst slide to
one of the best purely by becoming an object. Dark newspaper (white ink on
blue-black). Masthead: thick rule → "Chronicle" in serif → thin rule → date left /
"The day in the world" right. Lead story: wide photo, serif headline (wraps fully,
no truncation), "BBC · 14:02", user's reaction as an italic pull quote with accent
left-rule. "From the archive": two historical entries in two columns. A handwritten
REFLECTION NOTE resting on the page (warm off-tone, rotated ~2°, soft shadow, NO
border/card) — "For future you" question + answer.
**Input mechanic:** user saves a headline that mattered + writes a reaction (a
reaction is itself a record). Sources: GDELT + Wikipedia on-this-day + football.
Apple News has NO public API. "One year ago in Chronicle" links were CUT (duplicate
Your Past). Reflection uses existing `reflectionQuestion`/`reflectionAnswer`.
**Code notes:** ensure bottom padding so the full reflection note scrolls into
view; headline must not truncate. When the map slide is added it becomes slide 7
and the newspaper stays LAST (8 of 8).

---

## RUNNING CODE-NOTES (apply at build/wiring, don't re-Stitch)
- Sentence case everywhere; kill any tracked caps
- Header pattern is uniform: chevron-down dismiss, centred date + subtitle, share
- Portrait circles in mocks have baked-in text (Stitch artefacts) — real photos in build
- Placeholder images must use solid coloured Views with FIXED heights, never
  Images that collapse when they fail to load (this bug wasted several rounds)
- Slide 6 film side: no transport/progress, "Apple TV" label
- Slide 5: learned text ≤ story size
- Progress counters reflect live filled-input count, not slide position

---

## UPDATES SINCE THE JULY HANDOFF (August 2026)

### Slide 6 — needs a Listen/Watch update
The Sound EDITOR was restructured from three modes (Music / Film / Podcast) to
two verbs:
- **Listen** = songs + podcasts
- **Watch** = films + TV shows

The user now records **one Listen AND one Watch per day** (not one or the other),
each with a 1–10 rating and a note. The slide currently only tap-swaps between
music and film, so it needs to handle all four media types and the two-entry
model. Do this during the wiring pass, not as a separate design round.

The **note field doubles as the episode field** for podcasts and TV — its
placeholder changes by media type:
- song → "Why did this stick with you today?"
- podcast → "Which episode? How did it land?"
- film → "What did you make of it?"
- tv → "Which episode? What happened?"

This was a deliberate decision to avoid RSS-feed parsing: the iTunes API indexes
podcast *shows* but not episodes, and show-level is arguably the better memory
anyway. Episode-level search is explicitly NOT a gap to fix.

### Slide 5 — journal body should be serif
Diegetic exception #4 (see 01_DESIGN_SYSTEM.md): journal body text is Fraunces
serif in BOTH the Story editor and the Story slide, so the written day looks
identical in the place you write it and the place you read it. Chrome around it
stays Space Grotesk. Verify the slide matches.

### Slide 2 — the tap-to-swap interaction is shared with the Capture editor
The Capture EDITOR uses the same BeReal pair as this slide, and the same
tap-the-inset-to-swap gesture. Build them to feel like the same object in two
places — the editor is where you make the pair, the slide is where you see it.

---

## DATA WIRING (Sept 2026) — separate effort from the Today/editors wiring pass

The editors/Today wiring pass (see `02_BUILD_STATUS.md`) is a DIFFERENT piece of
work from wiring the carousel to real data. This section is the carousel's own
wiring pass, started Sept 2026, not finished.

**The shape:** `DayCardData` in `lib/dayCardData.ts` — one object per day, built
from a stored `DayEntry` plus "live extras" gathered once when the carousel
opens (never re-queried per slide): a read-only camera-roll query (same
on-device, no-permission-prompt pattern used elsewhere), and the legacy
top-level weather fields. `buildDayCardData()` is the pure function that maps
entry + extras → shape. `useDayCardData(dateKey, world)` in
`lib/dayCardExtras.ts` is the hook the carousel calls; it does the gathering
(`loadDayCardData`) and loads once per (dateKey, world), not on every render.

**Hide rule (locked):** each slide's slice of `DayCardData` is `null` when the
day has nothing for that slide, and the carousel drops that slide entirely — no
empty states. This is the density-adaptive approach from `05_ROADMAP_UNBUILT.md`
proved out on Today's own card before it needs to handle a sparse old day. The
Cover slide is the one exception — it's generated, so it always renders.

**Counter:** the dots and "N of M" now count only the slides actually present,
not a fixed 8 — decided and applied Sept 2026. `TOTAL_SLIDES` and the explicit
`pageNumber`s described earlier in this file are GONE from
`DayCardCarousel.tsx`.

**Per-slide status (real data vs. sample content):**
| # | Slide | Status |
|---|---|---|
| — | Carousel shell | Wired — builds only present slides from `DayCardData`, gathers live extras once on open, "N of M" counter |
| 1 | Cover | **DONE** — real weather (legacy fields), mood, live photo count, real people, weather-reactive globe glow. Glow mechanism works (right colour every time) but is flagged for a further visual design pass before release — see `09_CODE_NOTES.md` |
| 2 | Capture | **DONE Sept 2026** — real `mainPhotoUri`/`selfieUri`/`selfieIsBig` wired; both-photo (BeReal pair, tap-swap, hold-to-peek) and solo-photo (full-bleed, no swap/peek chrome) cases tested on device |
| 3 | Camera roll | Presence/absence wired (shows only when the live camera-roll query finds items); body still sample content |
| 4 | Three words | Presence/absence wired; body still sample content |
| 5 | Story | **DONE — real journal text, voice note, learned answer, and person-name highlighting wired; editor and slide now share journal page styling via chronicleTheme.ts constants; tested on device Sept 2026.** Slide shows if text, voice note, or learned is set; the learned section hides when empty. |
| 6 | Sound | **DONE — real listen/watch data wired, single-slot and both-filled cases tested on device, portrait posters for film/TV, swap behaviour confirmed, Sept 2026.** Shows if listen or watch is set. |
| 7 | Map | Not built, unchanged |
| 8 | Newspaper | Presence/absence wired — fed by the Wikipedia **any-year archive** (new, see `newsFeed.ts` below), max 2 entries; lead story stays hidden (see below) |

**Newspaper's reflection block is HIDDEN, not mapped to `futureNote`** — a note
to future-you isn't a reaction to the day's news, and mapping them would be
misleading. Logged as a future field needed if the slide keeps a reflection
concept. Same slide's lead-story mechanic ("user saves a headline that
mattered + writes a reaction") is unbuilt for the same reason as before — no
headline source chosen — see `09_CODE_NOTES.md`.

**`newsFeed.ts` change:** `fetchWikipedia` now also returns a separate
`wikipedia.archive` list — events from ANY year for the calendar date, not just
the day's own year. This is ADDITIVE: the existing `events`/`birth` (same-year
only, used by the old `DayCard.tsx`) are untouched. Old 30-day caches backfill
`archive` once on next load.

**`constants/chronicleTheme.ts` gained `blendWeatherGlow`, `weatherTarget`, and
`weatherGlowColor`** for the Cover slide's weather-reactive glow. `weatherGlow`/
`weatherFromTemp` (pre-existing) still back rain/mild; hot/cold/snow now use
explicit saturated target colours rather than a soft blend toward the accent —
a soft blend produced washed-out greys. See `09_CODE_NOTES.md` for the full
trace (shape bug, colour-format bug, then blend-vs-target bug) and the
launch-blocking design-polish flag.

**Not started this pass:** slides 2–6 and 8's actual bodies (still the original
sample content), slide 7 (map, unchanged blocker).
