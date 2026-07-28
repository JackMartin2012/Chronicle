# CHRONICLE — THE TODAY SCREEN & THE EDITORS

## The mental model
- **Today screen** = the overview where you see your whole day taking shape (a
  mosaic of tiles).
- **Editors** = focused bottom-sheet input surfaces you drop into by tapping a
  tile. Eight tiles → eight editors.
- Tap "With people" tile → people editor slides up → tag people → Done → the tile
  now shows those faces.
- Currently every editor is a SEPARATE preview screen (designed in isolation).
  WIRING later connects tap→editor→tile-updates. That wiring turns eight separate
  screens into one connected flow, and is the big deferred job.

---

## THE TODAY SCREEN (BUILT)
`components/today/TodayScreen.tsx`. A calm, dark mosaic of tiles. Journey to this
design was long — several tacky rounds — and the lesson stuck:

**What failed:** (1) an iOS-Settings-style label/value/chevron list ("felt like a
form"); (2) saturated coloured tiles (coral/peach/teal blocks — "tacky");
(3) per-tile physical objects at tile size (torn edges, hardware panels — too
subtle to register, read as busy).

**What worked (chosen: "calm, uniform dark tiles, content-led"):** every tile is
the SAME calm dark rounded tile (`#101c33`, radius 20, barely-there 1px white-6%
border, no coloured fills, no textures, no rotation). ALL variety comes from tile
SIZE and the CONTENT inside. Filled tiles show rich real content (the words as
words, album art, faces); empty tiles show a thin-line icon + short prompt. The
contrast between filled and empty IS the progress indicator, reinforced by a small
circular progress ring (5/8) in the top bar.

The life comes from MOTION, not decoration: tile press-scales to 0.96, ring ticks
with a haptic on completion, a finished tile settles with a brief highlight. This
is the one screen that only truly comes alive in motion — a static mock always
undersells it, which is why it was eventually BUILT to judge rather than
Stitch-mocked to death.

**Tile layout (partially-filled sample):** Today's capture (full-width, tall,
photo + selfie inset) · Three words (full, the words + mood emoji) · Your day
(full, story lines + waveform) · Listening-to (half) + With-people (half) ·
Something-learned (half, empty) + Places (half, empty) · For-future-you (full,
short, empty). Bottom: "See today as a day card" button.

**Code notes:** headings in sentence case (mock reverted to caps); the album-art
"Listening to" tile must be a fixed square matched in height to the People tile
beside it; button needs safe-area padding above the tab bar.

---

## THE EDITOR PATTERN (established by three-words editor)
Every editor is a bottom sheet, Present world, and follows:
- Grabber handle; chevron-down + Done on a top row; quiet title left-aligned beneath
- The CONTENT is the hero, not a form — you're composing the thing you'll look at
- Optional depth (e.g. the "why" on a word) reads as a BONUS you can skip, never a
  required second field — frictionless input is what makes people fill days
- Suggestions drawn from the user's OWN input (never guessing their feelings)
- A completion line + one flat Done button
- Micro-interactions: settle springs, selection scale/glow, haptic + ring bump on Done

---

## EDITOR 1 — THREE WORDS (designed; built once, kept presentation-only)
Three large word fields (monumental like the slide). Under each FILLED word, an
optional "Add why" (unused state) or the written reason in italic with an edit
pencil (used state). The word alone is complete.

**Mood row = the standout idea:** emoji SUGGESTED FROM THE TYPED WORDS, via an
on-device keyword→emoji map (warm→😌☀️🧡, unhurried→😪🍃, reunion→🥰🫂, +~15 common
mood words). Deduped, capped ~6, with a "+" at the end opening the full emoji
keyboard for anything. Falls back to a default face set if no words match or words
are incomplete (must NEVER render empty). Label: "Suggested from your words". This
grounds the suggestion in the user's own input and prompts reflection without
presuming feelings. CONFIRMED working.

## EDITOR 2 — PEOPLE (designed)
Title "Who were you with?". Top: TAGGED row (circular avatars, photo or
initial-in-circle, name, "×" to untag). Search field ("Add someone…"): as you
type, matching known people appear as tappable rows → tag them. Always an ADD-NEW
row when text doesn't match exactly ("Add 'Be' as someone new" + "You can add
their photo later"). When search empty: "Recent" people as one-tap avatars.
**Key principle:** tagging is one tap (known) or one tap + a name (new); PHOTOS
COME LATER (from the person's profile) — frictionless tagging grows the people
graph that the dashboard/events features run on. A "person" should be treated as a
real record (name + optional photo), not a loose string.

## EDITOR 3 — PLACES (designed)
Title "Where did today take you?". Top: TAGGED places (pill + type icon + name +
"×"). **"From today's photos" section (the star idea):** places DETECTED from
photo GPS that aren't tagged yet, shown as confirm-able suggestions (thumbnail
with a small pin badge, approx name, "3 photos near here · 16:45", "+ Add").
Tapping "+ Add" tags it and prompts a TYPE. Manual search field below
("Add a place…", same search+add-new pattern). "Recent" places as one-tap avatars.
**Place TYPE:** Home / Visited / Meaningful (house/pin/star icons; default
Visited) — drives map pin treatment and "every home I've lived in" albums later.

### THE LOCATION SYSTEM (important — designed here)
Two sources, working together:
1. **Photo metadata (automatic):** most camera-roll photos carry GPS (EXIF).
   Chronicle reads today's photos → gets raw geography for free → populates the
   globe (slide 1) and the map pins (slide 7). Zero friction. On-device, never
   uploaded (consistent with the privacy promise; add a privacy-policy line later).
2. **Manual place tagging (deliberate):** you name places ("Home", "Rocca") the
   way you tag people → gives named, meaningful places → builds Place profiles →
   feeds events/dashboard.
Over time the app LEARNS: tag "Home" at some coords once, and next time photos
appear there it suggests "Looks like you were at Home" — same responsive
intelligence as emoji suggestions and name-linking. You confirm, not type.

**People vs places:** kept as SEPARATE editors (each does one thing well) but they
DISPLAY together on slide 7 "Who and where". Two inputs, one display slide.

## EDITOR 4 — SOMETHING YOU LEARNED (designed; needs additions)
Title "What did you learn today?". A single open text hero, thin-line lightbulb
icon in accent, "This joins your things learned" beneath (the bank hook).
**TO ADD:** for stuck days (no fun fact), a ROTATING QUESTION as the placeholder
("What surprised you today?", "Did anyone tell you something interesting?", "What
didn't you know this morning?") + a SHUFFLE button to rotate prompts. Do NOT hand
the user a pre-written random fact — it must be THEIR learned thing or it's hollow
in the bank. Also the HOOK: a surfaced note-question (from For-future-you, see
below) can become the thing you answer here — the two editors feed each other.

## EDITOR 5 — FOR FUTURE YOU (designed; needs additions)
Title "Leave a note for future you". A single open text hero, envelope/clock icon,
"You'll see this again on a future day" beneath.
**TO ADD:** a "WHEN should this surface?" picker (In a month / In a year / On a
random future day / On a date I pick) — a note without a date is meaningless. Plus
an optional "make this a QUESTION I answer later" toggle. This is the light,
text-only cousin of Future Capsules (which are the rich media-ceremony feature —
see 05). The full surfacing/response/vault LOOP is roadmap (see 05).

## EDITORS NOT YET DESIGNED
- **Sound editor** (medium): search (iTunes API) for song/podcast/film + a 1-10
  rating input + reaction field + the swap between music and film.
- **Capture editor** (HARD): in-app camera + selfie (BeReal-style). Real device
  feature. Rules: `CameraView` not `ImagePicker.launchCameraAsync`;
  `ImageManipulator` `FlipType.Horizontal` for selfie, not CSS scaleX.
- **Story editor** (HARD): typing + voice recording (waveform + playback). Real
  device feature. `expo-av` retained for now. Voice memo either REPLACES the typed
  story (a day is written OR spoken, shown differently) — this was the leaning —
  or is a separate thing; decide at design time.
