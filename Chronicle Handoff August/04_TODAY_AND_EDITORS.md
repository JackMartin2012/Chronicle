# CHRONICLE — THE TODAY SCREEN & THE EIGHT EDITORS

## The mental model
- **Today screen** = the overview where you see your whole day taking shape (a
  mosaic of tiles).
- **Editors** = focused bottom-sheet input surfaces you drop into by tapping a
  tile. Eight tiles → eight editors.
- Tap "With people" tile → People editor slides up → tag people → Done → the tile
  now shows those faces.
- Currently every editor is a SEPARATE preview screen (designed and built in
  isolation). **WIRING later connects tap → editor → tile updates.** That wiring
  turns eight separate screens into one connected flow, and is the big deferred
  job.

---

## THE TODAY SCREEN (BUILT)
`components/today/TodayScreen.tsx`. A calm, dark mosaic of tiles.

**What failed on the way here:** (1) an iOS-Settings-style label/value/chevron
list ("felt like a form"); (2) saturated coloured tiles ("tacky"); (3) per-tile
physical objects at tile size (too subtle to register, read as busy).

**What worked:** every tile is the SAME calm dark rounded tile (`#101c33`, radius
20, barely-there 1px white-6% border, no coloured fills, no textures, no
rotation). ALL variety comes from tile SIZE and the CONTENT inside. Filled tiles
show rich real content (the words as words, album art, faces); empty tiles show a
thin-line icon + short prompt. The contrast between filled and empty IS the
progress indicator, reinforced by a small circular progress ring (5/8) in the top
bar.

The life comes from MOTION, not decoration: tile press-scales to 0.96, ring ticks
with a haptic on completion, a finished tile settles with a brief highlight. A
static mock always undersells this screen — which is why it was BUILT to judge
rather than Stitch-mocked to death.

**Tile layout (partially-filled sample):** Today's capture (full-width, tall) ·
Three words (full) · Your day (full) · Listening-to (half) + With-people (half) ·
Something-learned (half) + Places (half) · For-future-you (full). Bottom:
"See today as a day card" button.

**Code notes:** headings sentence case; the album-art "Listening to" tile must be
a fixed square matched in height to the People tile beside it; button needs
safe-area padding above the tab bar.

---

## THE 8/8 RING vs THE 8 SLIDES — NOT the same eight
- The ring counts **INPUTS** (things the user fills in).
- The slides count **DISPLAYS** (ways a day is shown).
The cover slide is generated, not filled in. Do not force a 1:1 mapping. Progress
counters must reflect the live count of filled inputs, not slide position. Both
Stitch and Fable have got this wrong repeatedly.

---

## THE EDITOR PATTERN (now proven across six built editors)
Every editor is a bottom sheet, Present world, and follows:
- Grabber handle; chevron-down + Done on a top row; quiet title **left-aligned**
  beneath (Stitch centred it once on the Story mock — always a code-note fix)
- The CONTENT is the hero, not a form — you're composing the thing you'll look at
- Optional depth (the "why" on a word, the note on a song) reads as a BONUS you
  can skip, never a required second field — frictionless input is what makes
  people actually fill days in
- Suggestions drawn from the user's OWN input (never guessing their feelings)
- A completion line + an 8-dot progress row + one flat Done button
- Micro-interactions: settle springs, selection scale/glow, haptic on Done

**Exact as-built numbers are in `08_EDITOR_BUILD_SPECS.md`. Read that before
building or modifying any editor.**

---

# THE EIGHT EDITORS

## EDITOR 1 — THREE WORDS ✅ BUILT
Three large word fields (monumental, like the slide). Under each FILLED word, an
optional "Add why" (unused state) or the written reason in italic with an edit
pencil (used state). The word alone is complete.

**Mood row = the standout idea:** emoji SUGGESTED FROM THE TYPED WORDS via an
on-device keyword→emoji map (warm→😌☀️🧡, unhurried→😪🍃, reunion→🥰🫂, +~15 common
mood words). Deduped, capped ~6, with a "+" opening the full emoji keyboard.
Falls back to a default face set if no words match (must NEVER render empty).
Label: "Suggested from your words". Grounds the suggestion in the user's own
input without presuming their feelings. CONFIRMED working.

## EDITOR 2 — PEOPLE ✅ BUILT
Title "Who were you with?". Tagged row of circular avatars (photo, or first
initial in an accent-tinted circle) with a "×" badge to untag. Search field
("Add someone…"): typing shows matching known people as tappable rows; there is
ALWAYS an add-new row when the text isn't an exact match ("Add 'Ti' as someone
new" + "You can add their photo later"). Empty search shows "Recent" people as
one-tap avatars, excluding anyone already tagged.

**Key principle:** tagging is one tap (known) or one tap + a name (new); PHOTOS
COME LATER (from the person's profile). Frictionless tagging is what grows the
people graph that the dashboard and events features run on. A "person" is a real
record (name + optional photo), not a loose string.

**Code notes from device review:** tagged and Recent rows look similar — a
"Tagged" label above the top row would make the two zones instantly readable.
There's dead middle space in the empty state (same issue Sound had).

## EDITOR 3 — PLACES ✅ BUILT (verify rework applied — see 02)
Title "Where did today take you?". Tagged places as pills (category icon + name +
"×").

**"From today's photos" — the star idea:** places DETECTED from photo GPS that
aren't tagged yet, shown as confirmable suggestion cards (thumbnail with a pin
badge, approximate name, "3 photos near here · 16:45", "+ Add"). You confirm
rather than type.

**Manual search below** with the same search + add-new pattern, and "Recent"
places as one-tap pills when empty.

### The category rework (Aug 2026 — the important design decision)
The original three "types" were Home / Visited / Meaningful. **This was wrong:**
Home and Visited describe your *relationship* to a place; Meaningful describes
*how much it matters*; and neither captures *what the place is* (a restaurant, a
gym). Three different axes crammed into one mutually-exclusive row.

**The fix:**
- **Eight CATEGORIES** (pick one): Home · Someone's place · Work or study ·
  Food & drink · Outdoors · Sport · Travel · Other
- **"Meaningful" becomes a SEPARATE star toggle** — any category can also be
  meaningful. Your grandparents' house is "someone's place" AND meaningful.
  Forcing a choice between them loses information.
- **Merge into an existing place:** GPS names are approximate, so a detected
  "Union Street" might actually be the flat you already call Home. Without a
  merge option you'd accumulate duplicate places for the same spot, which would
  wreck the "every home I've lived in" album later.

### THE LOCATION SYSTEM (designed, not built)
Two sources working together:
1. **Photo metadata (automatic):** most camera-roll photos carry GPS (EXIF).
   Chronicle reads today's photos → raw geography for free → populates the globe
   (slide 1) and map pins (slide 7). Zero friction. On-device, never uploaded.
2. **Manual place tagging (deliberate):** you name places the way you tag people
   → named, meaningful places → Place profiles → feeds events/dashboard.

Over time the app LEARNS: tag "Home" at some coordinates once, and next time
photos appear there it suggests "Looks like you were at Home". You confirm, not
type — the same responsive intelligence as the emoji suggestions.

**People vs places:** SEPARATE editors (each does one thing well) but they
DISPLAY together on slide 7. Two inputs, one display slide.

**Still open:** real place search needs a geo API — **Google Places vs Mapbox is
an unresolved decision** and it also blocks slide 7. Currently a local sample list.

## EDITOR 4 — SOMETHING YOU LEARNED ✅ BUILT
Title "What did you learn today?". Thin-line lightbulb icon in accent, then a
large open text hero (30px) you write directly onto the sheet. "This joins your
things learned" beneath (the bank hook).

**The stuck-day solution:** the placeholder is a ROTATING QUESTION, with a
shuffle button (a proper 36px circular tappable control, not a bare icon) that
cycles through six prompts: "What surprised you today?" / "What did you figure
out?" / "What do you know now that you didn't this morning?" / "What changed your
mind today?" / "What did someone teach you?" / "What did you get wrong?"

**Deliberately NOT:** handing the user a pre-written random fact. It must be
THEIR learned thing or it's hollow in the bank.

**The hook:** a surfaced note-question (from For-future-you) can become the thing
you answer here — the two editors feed each other. Roadmap, needs the vault.

## EDITOR 5 — FOR FUTURE YOU ✅ BUILT
Title "Leave a note for future you". **Two parts, the first conditional.**

**Part 1 — the surfaced note (only renders if a note is due today):** past-you
left a note and it has come due. Open-envelope icon (the compose side uses a
CLOSED envelope — same object, opened, because it *arrived*), "You wrote this a
year ago · 12 March 2025", the note text, then "Reply to past you" and a reply
field. Your reply pairs with the original and will feed the note vault later.

**The purple whisper — a deliberate design decision.** This card carries a faint
purple tint and hairline (`rgba(23,16,42,0.6)` background,
`rgba(155,114,255,0.25)` border) — the ONLY purple in a blue Present-world
editor. A note that surfaced from your past genuinely IS a Past-world thing
appearing in your Present, and this is the one place in the app where the two
worlds literally touch. **Never gold** — gold is Capsules only.

**Part 2 — compose a new note:** closed-envelope icon, open text hero, then the
piece that was missing from the original design: a **"When should this come
back?" picker** (In a month / In a year / Random future day / Pick a date), with
a confirming line that reflects the choice. A note without a date is meaningless.
Plus an optional "Make this a question I answer later" toggle — this stores a
flag nothing reads yet, included deliberately so the editor doesn't need
redesigning when the loop is built.

This is the light, text-only cousin of **Future Capsules** (rich media +
ceremony + own room/vault — see 05). The full surfacing/response/vault LOOP is
roadmap.

## EDITOR 6 — SOUND ✅ BUILT
**Restructured from three modes to two verbs (Aug 2026).**

Two segments: **Listen** (songs + podcasts) and **Watch** (films + TV shows).
Three modes was arbitrary — why does film get its own slot but TV doesn't? Two
verbs are cleaner, more human, and quietly fix the TV hole.

**One Listen AND one Watch per day** — two independent slots. Switching modes
shows that mode's slot; picking a song doesn't clear a chosen film. This matches
the built slide's tap-to-swap, which only makes sense if two can coexist.

**Merged dual search:** each mode fires TWO iTunes requests in parallel and
merges the results into one interleaved list, with a small type label on each row
("M83 · Song", "BBC · Podcast", "2011 · Film", "HBO · TV").
- Listen → `media=music&entity=song` + `media=podcast`
- Watch → `media=movie` + `media=tvShow&entity=tvSeason`

**Hero state:** artwork at 170px with the ambient glow reused from
`SlideSound.tsx` (never a second glow implementation), title, subtitle, "Change".

**Rating:** ten circular pills, 1–10, as a **fill gauge** — tap pill N and 1..N
fill. This was the risky element and it reads correctly as a rating on device.
Spring bounce + light haptic is the one playful moment on the screen.

**The note field doubles as the episode field** — placeholder varies by media
type (see 03 for the four variants). This is why episode-level search isn't
needed.

## EDITOR 7 — CAPTURE 🎨 DESIGNED, NOT BUILT (HARD)
Title "Capture today". **The hero is a single BeReal-style photo pair** — one
large rounded main-photo frame with the selfie insetted small in the top-left
corner, overlapping it. Beneath: two quiet outlined options for the main photo
("Take a photo" / "Choose from today"), a "Retake selfie" link, completion line,
Done.

**The design decision:** an early version made the selfie a large standalone hero
with the main photo as a separate block below — two photo areas competing, no
clear hierarchy. Making it the BeReal pair (mirroring slide 2) fixed it: one
dominant object, controls quiet beneath.

**Both capture paths, always a selfie:** the main photo can be shot now OR pulled
from today's camera roll (most people's real photos aren't taken inside the app);
the selfie is the fixed in-app ritual.

**Tap-to-swap:** tapping the small selfie makes it the large one, same as slide 2.
Bake this in from the start rather than retrofitting.

**Code notes from the mock:** Stitch drifted the title to "New Entry" (title case)
— it must be "Capture today". The mock's selfie inset had a Stitch watermark —
ignore.

**Technical rules (non-negotiable):** in-app `CameraView`, NOT
`ImagePicker.launchCameraAsync` (avoids the native iOS confirmation-screen
inversion bug). Selfie flip via `ImageManipulator` `FlipType.Horizontal`, NOT CSS
`scaleX`.

## EDITOR 8 — STORY 🎨 DESIGNED, NOT BUILT (HARD)
Title "Your day". **The hero is a ruled notebook page** — the same dark journal
page that appears as slide 5, so writing your day and reading it later are
visibly the same object. You write directly on the page.

**Journal body text is Fraunces serif** — diegetic exception #4. Chrome around it
stays Space Grotesk. See 01.

**Voice as a quiet companion, not an equal path.** The original leaning was that
voice REPLACES the typed story (a day is written OR spoken). The decision went
the softer way: the notebook is always there to write on, and voice is an
optional recording attached to the page — reading your entry aloud, or a spoken
note the writing can't capture. You're never forced to choose.

Voice row sits BENEATH the page, low-contrast, visibly secondary: thin-line mic +
"Record a voice note"; while recording, a live waveform + timer; when recorded, a
slim playback strip (waveform, play, duration, delete).

**Code notes from the mock:** Stitch centred the title — must be left-aligned like
every other editor. The ruled page could sit slightly lower.

**Technical:** `expo-av` retained for voice memos (expo-audio migration deferred).

**Also hooks here (roadmap):** the Learned editor's answer can surface on this
slide as the pinned "Something I learned" note.
