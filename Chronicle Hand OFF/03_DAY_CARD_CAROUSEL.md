# CHRONICLE — THE DAY CARD CAROUSEL

A swipeable full-screen carousel that opens when you tap a saved day. Up to 8
slides. Shared chrome (top bar: chevron-down left, share right, centred date +
per-slide subtitle; bottom: 8 page dots + "N of 8") persists across slides via
the carousel shell; each slide renders only its body.

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
