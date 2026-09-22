# CHRONICLE — DEFERRED CODE NOTES (collected)

Every deferred "code note", fix, and open item scattered across files 00–08,
gathered in one place. Grouped by screen, newest additions last.

**This file collects — it does not fix.** Nothing here has been actioned. Each
line says what and where it came from, so the original context is one lookup
away. When you fix one, tick it here AND in its source file.

---

## DAY CARD — SLIDES (source: 03_DAY_CARD_CAROUSEL.md)

- [ ] **Slide 5 Story** — learned text must not render larger than the story
      body; the hierarchy was inverted in an early mock. *(03:83)*
- [ ] **Slide 6 Sound** — rating boxes need larger tap targets (44pt hitSlop).
      *(03:98)*
- [ ] **Slide 8 Newspaper** — add bottom padding so the full reflection note
      scrolls into view; the headline must not truncate. *(03:136)*
- [ ] **Slide numbering** — when the map slide is added it becomes slide 7 and
      the newspaper stays LAST at 8 of 8. *(03:137)*

## DAY CARD — SLIDES OUT OF DATE (source: 02_BUILD_STATUS.md)

- [ ] **`SlideSound.tsx`** — still tap-swaps between *music* and *film*. The
      Sound editor is now Listen/Watch (Listen = songs + podcasts, Watch =
      films + TV), so the slide needs to display all four media types. Not a
      blocker — do it in the wiring pass. *(02:84)*
- [ ] **`SlideStory.tsx`** — body text should use Fraunces serif to match the
      Story editor (diegetic exception #4). **Checked Aug 2026: it does NOT.**
      Line 77 passes `w.fontRegular`, which is Space Grotesk in the Present
      world, so the same day currently renders in a different font in the
      editor and on the card. *(02:88)*
- [ ] **`SlideStory.tsx` page treatment has diverged from `StoryEditor.tsx`** —
      the editor was tuned on device and the slide was left alone deliberately
      (unreviewed edit). The page is meant to be ONE object in both places, so
      the slide should be brought up to match once the editor is signed off:
      | | slide | editor |
      |---|---|---|
      | `RULE_SPACING` | 36 | 28 |
      | entry font size | `type.body` (16) | 18 |
      | rule opacity | 0.04 | 0.08 |
      | entry font | Space Grotesk | Fraunces |
      Neither value is shared — both files declare their own module const and
      inline style, so they must be changed in two places. Consider lifting
      them into `chronicleTheme.ts` at that point. *(new, Aug 2026 build)*

---

## TODAY SCREEN (source: 04_TODAY_AND_EDITORS.md)

- [ ] Headings in sentence case — the mock reverted to caps. *(04:42)*
- [ ] The album-art "Listening to" tile must be a fixed square, matched in
      height to the People tile beside it. *(04:42)*
- [ ] The "See today as a day card" button needs safe-area padding above the
      tab bar. *(04:43)*
- [x] **FIXED Sept 2026 — the sound tile now swipes between Listen and Watch when both exist** (paging scroller + two dots in `TodayScreen.tsx`). Original note follows.
- ~~**The sound tile only ever shows one of the two slots.** `DayEntry.sound`
      holds independent `listen` and `watch` entries, but Today's mosaic has a
      single "Listening to" tile. When both are filled, `listen` takes
      priority and `watch` is invisible on Today — even though
      `countFilledInputs` counts either one as the same input, so the progress
      ring can read filled while a whole entry never renders anywhere on the
      screen. Not a wiring bug: Today needs a second tile (or a combined one)
      before both slots can be seen, which is a layout decision, not something
      to patch in the wiring pass. *(new, wiring pass step 3b)*~~

---

## EDITORS

### ALL EDITORS — shared chrome, keyboard behaviour (source: this session)
- [ ] **The `08` keyboard pattern breaks on a fixed-height sheet.** `08:44`
      prescribes wrapping the sheet in `KeyboardAvoidingView` with
      `behavior='padding'`. But every editor's sheet is a FIXED height (78%,
      Places 92%) anchored to the bottom, so the padding translates the whole
      sheet upward and pushes the title, chevron and top Done row off the top
      of the screen. Confirmed on device in the Story editor.
      **All six other editors use the identical pattern and have the same
      latent bug** — `SoundEditor`, `LearnedEditor`, `FutureNoteEditor`,
      `PeopleEditor`, `PlacesEditor`, `CaptureEditor`. It shows most in
      whichever editor you type in longest, which is why Story surfaced it.
      `StoryEditor.tsx` now does it correctly instead: track keyboard height via
      `Keyboard.addListener`, keep the sheet's top edge fixed, set
      `marginBottom: keyboardHeight` so it rests on the keyboard, and let the
      content area absorb the difference. **Port that approach to the other six
      and update the pattern in `08_EDITOR_BUILD_SPECS.md`.** *(new, Aug 2026)*

### Sound
- [ ] **KNOWN LIMITATION — film entries have no poster.** Film search uses
      Wikipedia (iTunes movie search returns nothing any more), and Wikipedia
      doesn't carry poster artwork, so films show a placeholder icon in the
      results, the editor hero and the Today tile. Deliberately left as-is: a
      TMDB key would fix it, but that's a standing API-key commitment already
      ruled out, and this is a cosmetic gap. **Nothing to build.** *(Sept 2026)*

### People (source: 04_TODAY_AND_EDITORS.md)
- [ ] Tagged and Recent rows look too similar on device — a "Tagged" label above
      the top row would make the two zones instantly readable. *(04:101)*
- [ ] Dead middle space in the empty state (the same issue Sound had). *(04:103)*

### Places (source: 02_BUILD_STATUS.md, 05_ROADMAP_UNBUILT.md)
- [ ] Real place search is still a local sample list — blocked on the geo API
      decision below. *(05:218)*

### Capture (source: 04_TODAY_AND_EDITORS.md + this session)
- [ ] Title must stay "Capture today" — Stitch drifted it to "New Entry" in
      title case. *(04:244)*
- [ ] Ignore the Stitch watermark on the mock's selfie inset. *(04:245)*
- [ ] **Once a selfie has been taken, the button should offer "Retake selfie"**
      rather than "Take a selfie". *(new, Aug 2026 build)*
- [ ] **Re-confirm the main frame holds 3:4 once real photos are in it** —
      measured at exactly **3:4.00** on device against placeholder gradients
      (Aug 2026). The frame uses `aspectRatio` with no explicit height and
      `overflow: 'hidden'`, so content cannot change it; this is a belt-and-
      braces check for pass two, not a known problem. *(new, Aug 2026 build)*

### Story (source: 04_TODAY_AND_EDITORS.md)
- [ ] Title must be left-aligned like every other editor — Stitch centred it.
      *(04:271)*
- [ ] The ruled page could sit slightly lower. *(04:272)*

### Learned / For future you (source: 04_TODAY_AND_EDITORS.md)
- [ ] The surfaced note-question → answered-in-Learned hook needs the note vault
      before it can work. Roadmap, not a code fix. *(04:166)*

---

## DESIGN SYSTEM (source: 01_DESIGN_SYSTEM.md)

- [ ] **Token conflict** — `type.caption` (12pt) and `type.micro` (11pt) fall
      below the theme's own `FRAUNCES_MIN_SIZE = 13`. Harmless in the Present
      (Space Grotesk), but when the PAST variants are built, Past must override
      caption/micro to 13pt rather than lowering the floor. *(01:110)*
- [ ] Sentence case reverts to caps constantly across mocks — always fix as a
      code note, never as a Stitch re-run. *(01:64)*

---

## TEMP STATE — REVERT BEFORE LAUNCH (source: 02_BUILD_STATUS.md)

- [x] **DONE Sept 2026 — `app/_layout.tsx` boots straight into a preview route** instead of
      onboarding/tabs. Fine while reviewing editors, must go before launch.
      *(02:67)*
- [x] Editor preview routes + `today-preview.tsx` + the `PREVIEW` link DELETED (Sept 2026). Still throwaway: `preview.tsx`, `data-layer-check.tsx`. *(02:69)*
- [ ] **`HAS_SAMPLE_PHOTOS` in `CaptureEditor.tsx`** — dev const filling both
      photo slots with placeholder gradients; delete when the camera is wired.
      *(new, Aug 2026 build)*

---

## NATIVE PERMISSION STRINGS (source: this session)

Expo Go ships its own Info.plist entries, so permissions "work" there with no
config at all. **A dev build or TestFlight build does not** — a missing usage
description terminates the app the moment it asks. Verify with
`npx expo config --type introspect --json` and grep for `Usage`.

- [x] **`NSCameraUsageDescription`** — was absent; would have crashed the dev
      build on the Capture editor's first camera request. Fixed Aug 2026: the
      `expo-camera` plugin is now configured in `app.config.js` with a real
      string. `recordAudioAndroid: false` because Chronicle never records video.
- [ ] **`NSPhotoLibraryUsageDescription`** — present but GENERIC ("Allow
      $(PRODUCT_NAME) to access your photos"), inherited from an autolinked
      default rather than written for Chronicle. Won't crash the camera-roll
      picker in Capture pass two, but it's the text the user actually reads in
      the system prompt, and App Review dislikes boilerplate. Write a real one.
- [ ] **`NSPhotoLibraryAddUsageDescription`** — same, generic.
- [ ] **`NSMicrophoneUsageDescription`** — same, generic. This is the one the
      Story editor's voice recording will use in ITS pass two, so write it
      before that lands.
- [ ] **`NSLocationWhenInUseUsageDescription`** (+ the two Always variants) —
      same, generic. Used by the weather fetch and by photo-GPS place detection.

---

## BLOCKED / DECISIONS OUTSTANDING (source: 07_INFRASTRUCTURE.md, 05)

- [ ] **Apple Developer Program enrolment (£79/yr)** — not started. Gates the
      dev build → gates Mapbox → gates slide 7. 24–48h to approve and can be
      done from a phone. Pure waiting time, so start it early. *(07:113)*
- [ ] **Geo API decision** — Google Places vs Mapbox for place search. Blocks
      slide 7 AND real search in the Places editor. Mapbox is already installed
      and configured (argues for consolidating); Google Places has better name
      coverage for small venues. *(07:117, 05:215)*
- [ ] **Mapbox token rotation tidy-up** still outstanding. *(07:119)*

---

## CLOSED THIS SESSION

- [ ] **OPEN — no progress ring on the Today tab.** The old ring is hidden there
      (it counts old-style fields) and `TodayScreen` drops its own ring when
      `embedded`. Wanted: show the new ring (`countFilledInputs`) in
      `explore.tsx`'s header on the Today tab.
- [ ] **OPEN — `fetchWeather` in `explore.tsx` still runs on mount** and writes
      the day record directly (bypassing the `dayEntry.ts` write queue, though it
      re-reads first and keeps the new `chronicle` field). It also triggers the
      location permission prompt on opening the tab. Nothing displays weather
      any more. Decide: move into the new Today, or remove.

- [x] **Double-Done bug (all 8 editors)** — Done called `saveDayEntry` without
      waiting, then dismissed; Today's `reload()` ran while the write was still
      in flight and read the OLD value. Fixed once in `lib/dayEntry.ts`: all
      writes go through one promise chain and `loadDayEntry` awaits it. Don't
      re-patch editors; any new reader/writer must use these two functions.
- [x] **Sound Watch had no films** — iTunes Search now returns ZERO movies for
      every title (music + TV still work). Film search moved to Wikipedia's free
      keyless API (`SoundEditor.tsx`, `parseWikiFilms`): good titles/year/
      director, but almost never a poster (non-free). TMDB has posters but needs
      an API key — revisit if posters matter.

- [x] **Bottom Done button removed from all 8 editors** (Sept 2026). Top-right
      Done is the sole save-and-dismiss control; `08` shared chrome updated.
      Places sheet is now full height below the safe-area inset.
- [x] **Sound editor reopened blank** — seeding worked, but the hero's
      `heroAnim` opacity starts at 0 and only `selectResult` animated it to 1, so
      a seeded entry rendered invisible. Seeding now sets it to 1. Any editor
      that fades content in via an Animated.Value must set it on seed too.
- [x] **Three Words: iOS AutoFill pill** covering mood suggestions —
      `textContentType="none"` + `autoComplete="off"` on the word and why inputs.
- [x] **Places**: Recent above "From today's photos"; photo cards shrunk; add-
      picker pinned to the top of the scroll; search placeholder alignment fix.

- [x] **Places editor rework verified as applied** — 02 and 00 both flagged this
      as unconfirmed. Checked the committed file: 92% sheet height, eight
      category chips, separate `meaningful` toggle, and merge-into-existing are
      all present. The `08_EDITOR_BUILD_SPECS.md` rework spec does NOT need
      running. *(was 02:50, 00:22)*

---

## DAY CARD DATA WIRING (decisions locked Sept 2026)

- [ ] **Future upgrade — `fetchHistoricWeather`.** The day card reads the LEGACY
      top-level `weatherTemp` / `weatherEmoji` / `weatherDescription` from the
      raw `day_entry_` record for now (`readLegacyWeather` in
      `lib/dayCardData.ts`). Historic weather lookup is deliberately OUT of scope
      for the wiring pass. Note `weatherTemp` defaults to 0 on unset records, so
      presence is judged by emoji/description, not the temperature.
- [ ] **Future field needed — Newspaper reflection.** The slide's reflection
      block is HIDDEN, not mapped to `futureNote`: a note to future-you is not a
      reaction to the day's news. If the slide keeps a reflection concept it needs
      its own field (e.g. a reaction attached to a saved headline). The slide is
      fed by the Wikipedia archive entries alone; the lead-story + reaction half
      stays hidden until a headline-save feature exists.
- [x] **`capturedAt`** — DONE Sept 2026. `Capture.capturedAt` in `lib/types.ts`,
      stamped by `CaptureEditor` on Done only when the photos changed (reopening
      untouched keeps the old stamp). Never backfilled; old captures show no
      "Captured HH:MM" line.
- [ ] **Hidden slides vs "N of 8"** — DECIDED: count visible slides only ("3 of
      5"), no fixed 8. To apply when the carousel is wired (drop `TOTAL_SLIDES`
      and the explicit `pageNumber`s in `DayCardCarousel.tsx`).

- [ ] **Personally significant world events — this IS the Newspaper lead story.**
      Jack asked about logging a historical/world event as significant within a
      day's entry ("I remember where I was when X happened"). Not a new feature:
      it is the Newspaper slide's LEAD STORY mechanic already described in
      `03_DAY_CARD_CAROUSEL.md` — "user saves a headline that mattered + writes a
      reaction." Unbuilt because the headline source (GDELT/NewsAPI) was never
      chosen. It belongs on the day's own card, NOT the You tab, since it's tied
      to a specific date. Revisit once the archive-only Newspaper slide is proven;
      building the lead story is the next step after that, contingent on the same
      news-API decision logged as open in `07_INFRASTRUCTURE.md`.
- [x] **`fetchWikipedia` any-year archive** — added Sept 2026 as a SEPARATE
      `wikipedia.archive` list, NOT by broadening `events`. `DayCard.tsx:586`
      filters `events` to the day's year and the old fetch capped at 5, so
      broadening `events` would have crowded same-year entries out of the old
      screen. Old caches backfill `archive` once on next load.

---

## NOTABLE DAYS (idea, Sept 2026 — NOT scoped, NOT built)

Maps onto the Life Timeline / Big Moments concept in
`Chronicle_Master_Document.docx` section 4: "a separate curated timeline for the
big events and trips of your life... the greatest hits... distinct from the daily
flashback feed." This toggle is the missing interaction model for getting content
INTO that timeline.

**Mechanic:** a toggle at the bottom of the TODAY SCREEN (whole-day, not inside
one editor). Flipping it on creates a record in a separate NOTABLE EVENTS
collection, not just a flag on the day — it is a curated list, not a filtered view
of the timeline.

**Each notable-event record holds:**
- a link/reference back to the source day (dateKey)
- a TITLE, typed by the user at the point of toggling (e.g. "Ella's wedding") — a
  new field, distinct from the diary text, since a title makes a better list label
  than the first line of a journal entry
- NO separate body text — the day's existing story / three words / etc remain the
  content, read via the link

**Where it lives:** under the future YOU TAB — a scrollable list of titled cards.
Tapping one opens a preview/summary of that day's entry; a button from the preview
jumps to the full day (the day card carousel).

**Distinct from** the Newspaper lead-story / world-events concept logged above —
that is about the wider world, this is about the user's own significant days.

Revisit once the You tab and the current carousel wiring are further along.

---

## COVER GLOBE GLOW — shape was the real bug, not colour (Sept 2026)

Traced across several rounds: the weather hue never showed on device even
after `blendWeatherGlow` composited a correct, distinctly-different colour per
condition (confirmed by direct calculation, not just code reading). Root cause
found by comparing to the ORIGINAL STITCH MOCK, not by further colour math:

- **Mock:** a tight, defined ring of light hugging the globe's silhouette —
  small blur, high opacity, reads as an outline on the sphere.
- **What was built:** a wide, soft, diffuse glow spread well beyond the globe —
  large blur radius (40), low opacity (0.55), no defined edge.

A spread that diffuse is too thin per-pixel for any hue to register, regardless
of what `shadowColor` is set to — the earlier "identical across all five
weather states" symptom was a SHAPE problem, not a colour problem. `SlideCover`
now uses `shadowOpacity: 0.9` / `shadowRadius: 10`. Re-verify the weather hue
against this new shape before trusting it further.

---

## WEATHER PARTICLE EFFECTS ON COVER (idea, Sept 2026 — NOT scoped, NOT built)

A designed EXTENSION of the weather-reactive glow, not a tuning change to it:
falling rain, drifting snow, sun rays over the globe, depending on the day's
weather. This is a new animated element (particles), distinct from the glow's
colour treatment which is done (see the glow shape/colour fixes logged above).

Deserves its own design pass — possibly its own Stitch round — once the
carousel's core data wiring is finished. Not scoped, not started.

---

## STATUS — Cover weather glow (Sept 2026): functional, not launch-ready

The weather-reactive glow mechanism is proven end to end — the right colour
for each weather kind reaches the ring every time, confirmed via on-screen hex
readout across several rounds of fixes (shape, colour format, target
colours). But the VISUAL RESULT isn't yet satisfying and needs a proper
design pass before release, likely including the weather-particle idea
(rain/snow/sun animation, logged above) rather than glow tuning alone.

Not blocking further carousel wiring — flag before launch.
