# CHRONICLE — BUILD STATUS

Single source of truth for what exists vs designed vs planned.

> ## ⚠️ BEFORE TESTING ANY CAROUSEL SLIDE
> Verify how the carousel is currently reached — check whether
> `app/(tabs)/index.tsx` or wherever "On This Day"/"Your Days" opens a day now
> points at the new `DayCardCarousel`, or still opens the old `DayCard.tsx` via
> the temp `/preview` + `dateKey` redirect pattern. Do not assume either way —
> this has changed across sessions before. State clearly in your response
> which one is currently true before giving device-testing instructions.

> ## ⚠️ THIS FILE DESCRIBES CODE, NOT DESIGNS
> An entry here means **the code does this**, verified by opening the file — not
> that a Stitch mock was approved, not that a prompt was written, not that it
> looked right in a screenshot. Designs belong in `03`, `04` and `08`.
>
> **This has already gone wrong once.** ThreeWordsEditor was listed as *"Built.
> Emoji-suggested-from-words confirmed working"* for months. The mock was
> approved and working; the component had no `useState` and no `TextInput` and
> could not accept a single character. It was only caught when the wiring pass
> tried to save its output and found there was none.
>
> Before writing "Built", open the file. If you cannot point at the state and
> the inputs, it is DESIGNED, not built.

**Updated September 2026 — all 8 editors are BUILT and WIRED. The wiring pass
is COMPLETE.**

- All 8 editors read from and write to real storage (`lib/dayEntry.ts`, on the
  existing `day_entry_${dateKey}` AsyncStorage key). Each seeds itself from
  today's record on open and saves on the top-right Done.
- `TodayScreen.tsx` reflects live data: tiles update the moment an editor
  closes, tapping a tile opens the right editor, and the progress ring counts
  real filled inputs.
- Saves are queued and reads wait for them (fixes the old "Done needed two
  presses" race). Verified end-to-end on device, all 8 editors.
- **Capture drives the real camera and camera roll; Story records real audio.**
- The temp redirect in `app/_layout.tsx` is GONE — the app boots into the real
  onboarding / tabs flow again. The 8 editor preview routes and
  `PreviewHarness.tsx` are deleted.

**The new Today screen is now the "Today" tab of Your Present** (Sept 2026).
`app/(tabs)/explore.tsx` still owns the header + tab switcher and renders
`<TodayScreen embedded />` for the Today tab; **Your Days, Daily Selfie and
Favourites are the old code, untouched** (except Your Days now reloads every
time it's opened, so a day filled in this session appears). The old Today block
was removed from `explore.tsx` (in git history before that commit); its state
and modals are still in the file as dead code (hence the extra lint warnings).
The old progress ring is hidden on the Today tab, and `TodayScreen` drops its
own top bar when `embedded` — **so there is currently NO progress ring on the
Today tab.**

**Old screens read the OLD field names only.** So every save also writes
simplified legacy fields (photo, mood, three words as a plain list, story text,
song, people names, places, learned) — `legacyMirror()` in `lib/dayEntry.ts`.
That is what makes a day from the new editors show in Your Days / DayCard /
Vault. Lossy: no why-notes, place categories, watch ratings. Reads prefer the
new nested shape, so it never feeds back. Any NEW field an editor saves needs
adding to the mirror if the old screens should see it.

Last commit before this cleanup: `e1c4536` on `main`, pushed to GitHub.

---

## BUILT and working on device (Expo Go)

### Foundation
| Component | File |
|---|---|
| Design tokens | `constants/chronicleTheme.ts` |
| Centralised fonts | `app/_layout.tsx` |
| Mapbox config (env-var approach) | `app.config.js` |

### Day card carousel
This table is the SLIDE COMPONENTS — "exists and renders" only. A separate data
WIRING pass started Sept 2026 (its own effort from the Today/editors wiring
pass below) — see `03_DAY_CARD_CAROUSEL.md` § "DATA WIRING (Sept 2026)" for
which slides read real data vs. still show sample content.

| # | Slide | File | Object |
|---|---|---|---|
| — | Carousel shell | `components/daycard/DayCardCarousel.tsx` | pager + chrome + dots — **wired Sept 2026**: builds `DayCardData` via `useDayCardData`, drops slides with a null data slice, "N of M" not fixed 8 |
| 1 | Cover | `SlideCover.tsx` | Globe (real NASA image) — **DONE Sept 2026**, real data + weather glow (colour mechanism works, flagged for a design pass before release, see `09`) |
| 2 | Capture | `SlideCapture.tsx` | BeReal pair, tap-swap, hold-to-peek — **DONE — real photos wired, both-photo and solo-photo cases tested on device Sept 2026.** |
| 3 | Camera roll | `SlideCameraRoll.tsx` | Polaroid + thumb strip — presence wired, body still sample |
| 4 | Three words | `SlideThreeWords.tsx` | Monumental typography — presence wired, body still sample |
| 5 | Story | `SlideStory.tsx` | Dark ruled journal page — **DONE — real journal text, voice note, learned answer, and person-name highlighting wired; editor and slide now share journal page styling via chronicleTheme.ts constants; tested on device Sept 2026.** |
| 6 | Sound | `SlideSound.tsx` | Album art + ambient glow — presence wired, body still sample |
| 8 | Newspaper | `SlideNewspaper.tsx` | Newspaper page — presence wired, fed by Wikipedia any-year archive; lead story still hidden |

**New in `lib/`:** `dayCardData.ts` (the `DayCardData` shape + `buildDayCardData`)
and `dayCardExtras.ts` (`useDayCardData`, the live camera-roll/weather/archive
query, gathered once per carousel open). `newsFeed.ts` gained a separate
any-year `wikipedia.archive` list (additive — the old same-year `events` used
by `DayCard.tsx` is untouched). `constants/chronicleTheme.ts` gained
`blendWeatherGlow` / `weatherTarget` / `weatherGlowColor` for the Cover glow.

### Today screen
`components/today/TodayScreen.tsx` — calm dark mosaic of tiles.

### Editors — ALL 8 BUILT (all in `components/today/editors/`)
`ThreeWordsEditor.tsx` is the exception to the folder: it sits in
`components/today/`.

| Editor | File | State |
|---|---|---|
| Three words | `ThreeWordsEditor.tsx` | Built. Emoji-suggested-from-words confirmed working. |
| Sound | `SoundEditor.tsx` | Built. **Restructured to Listen/Watch** — see below. |
| Something learned | `LearnedEditor.tsx` | Built. Shuffle + rotating questions working. |
| For future you | `FutureNoteEditor.tsx` | Built. Surfaced-note card + when-picker + question toggle. |
| People | `PeopleEditor.tsx` | Built. Tag / search / add-new confirmed working on device. |
| Places | `PlacesEditor.tsx` | Built. **Rework VERIFIED APPLIED** — see below. |
| **Capture** | `CaptureEditor.tsx` | **Built, both passes — real camera. See below.** |
| **Story** | `StoryEditor.tsx` | **Built, both passes — real audio. See below.** |

The eight editor preview routes and `today-preview.tsx` are deleted. Still
present and throwaway: `app/preview.tsx` (day card carousel) and
`app/data-layer-check.tsx`.

---

## CAPTURE EDITOR — built Aug 2026, camera is live
Layout: the BeReal pair as one dominant object. Main frame locked to 3:4 via
`aspectRatio` with no explicit height (measured at exactly 3:4.00 on device);
its width is capped so the derived height always leaves the buttons on screen
without scrolling. Tap-to-swap works; a filled slot's button becomes "Retake".
The outlined buttons follow whichever photo is large — two for the day's photo,
one centred "Take a selfie" — cross-faded.

**Camera path:** in-app `CameraView`, never `ImagePicker.launchCameraAsync`.
Permission on first use, denial explained in a quiet line. After the shutter a
**review step** — full-screen shot, blue tick to accept, Retake to discard —
built as our own screen inside the existing Modal with `CameraView` still
mounted, so the native iOS confirmation screen is never involved.

**⚠️ NO ImageManipulator flip on the selfie, deliberately.** On expo-camera 17
the `mirror` prop un-mirrors the saved file as well as mirroring the preview, so
an explicit flip applies twice and the selfie saves backwards. Verified on
device. Both code sites carry a comment. The rule was stated the OTHER way round
in `04`, `00_START_HERE` and `08` — **all three corrected Aug 2026.**
Version-dependent: re-test if expo-camera is ever downgraded.

**Camera roll picker:** `expo-media-library`, filtered to photos created today,
3-column grid, tap to choose — no confirm step, since you're picking a photo
you've already seen. Main photo only; the selfie stays the in-app ritual.
`localUri` from `getAssetInfoAsync`, resolved one asset at a time. Empty state
is a quiet line and a way back, never an empty grid.

`app.config.js` gained the `expo-camera` plugin — `NSCameraUsageDescription` was
absent entirely and would have terminated a dev build on first camera use.

## STORY EDITOR — built Aug 2026, recording is live
Layout: the ruled notebook page as hero, matched to `SlideStory.tsx` so editor
and card are the same object. Entry text is **Fraunces** (diegetic exception #4)
and nothing else on the screen is. 18px on 28pt rules, text top padding a
multiple of `RULE_SPACING` so line one sits in register. Rules render INSIDE the
scrolled content so the paper moves as one object.

**Voice (expo-av — deprecated in SDK 54, migration deferred project-wide, do NOT
migrate in isolation):** three states — resting, recording (live waveform +
timer + stop), recorded (play/pause, waveform, duration, delete). All three
pinned to the same 44pt height so the companion can never become a second hero.
The waveform is real dBFS metering sampled every 100ms, not decoration.
`allowsRecordingIOS` resets to false on stop or playback routes to the earpiece.

Recording and typing **coexist** — the voice path never touches the entry text.
An active recording blocks the keyboard collapse so the stop control stays
reachable.

**⚠️ Keyboard handling departs from the shared `08` pattern.** See `09` — the
`KeyboardAvoidingView` approach in `08` breaks on a fixed-height bottom-anchored
sheet, and **all six other editors still have that latent bug.**

---

## ✅ RESOLVED — Places editor rework
Previous sessions flagged this as unverified. **Checked Aug 2026 against the
committed file: the rework WAS applied.** 92% sheet height, eight category
chips, separate `meaningful` toggle, and merge-into-existing are all present.
The rework spec in `08_EDITOR_BUILD_SPECS.md` does **not** need running.

---

## TEMP STATE — what's left
- ~~`app/_layout.tsx` preview redirect~~ — **REMOVED Sept 2026.** Boots into
  onboarding/tabs.
- ~~The 8 `*-editor-preview` routes~~ — **DELETED.**
- ~~`app/today-preview.tsx`~~ and the `PREVIEW` link in `explore.tsx` —
  **REMOVED Sept 2026.**
- Still throwaway: `app/preview.tsx`, `app/data-layer-check.tsx`.
- `HAS_SAMPLE_PHOTOS` in `CaptureEditor.tsx` — dev const, currently `false`.
Full list in `09_CODE_NOTES.md`.

---

## DESIGNED and approved, NOT built
| Thing | Notes |
|---|---|
| **Slide 7 "Who and where"** | Map-led route object. Deferred behind Mapbox + dev build + Apple enrolment. Build LAST. Three earlier approaches REJECTED (passport-dark, passport-cream, notebook) — do not retry. |

This is now the ONLY designed-but-unbuilt screen. Every editor is built.

---

## NEEDS UPDATING because of decisions made last session
- **`SlideSound.tsx`** currently tap-swaps between *music* and *film*. The Sound
  editor is now **Listen / Watch**, where Listen covers songs + podcasts and Watch
  covers films + TV. The slide needs a small update to display all four media
  types. Not a blocker — do it in the wiring pass.
- ~~**`SlideStory.tsx`** body text should use Fraunces serif to match the Story
  editor (diegetic exception #4). **Checked Aug 2026: it does NOT** — line 77
  passes `w.fontRegular`, which is Space Grotesk in the Present world. The same
  day currently renders in a different font in the editor and on the card.~~
  **RESOLVED Sept 2026** — editor and slide now both use `STORY_ENTRY_FONT(world)`
  from `chronicleTheme.ts` (Space Grotesk in Present).
- ~~**`SlideStory.tsx` page treatment has diverged from `StoryEditor.tsx`** — the
  editor was tuned on device (28pt rules vs 36, 18px vs 16, rules at 8% vs 4%)
  and the slide was deliberately left alone. The page is meant to be ONE object
  in both places. Neither value is shared; both files declare their own. See
  `09_CODE_NOTES.md`.~~ **RESOLVED Sept 2026** — the slide's values (36pt rules,
  16px, 4%) won; both files import `STORY_RULE_SPACING`, `STORY_ENTRY_FONT_SIZE`,
  `STORY_RULE_OPACITY`, `STORY_ENTRY_FONT` from `chronicleTheme.ts`.

---

## NOT built — bigger features (see 05_ROADMAP_UNBUILT.md)
- The note-vault loop (for-future-you → surfaces → respond → vault)
- The dashboard
- Events / tagging / reminders system (1.1 flagship)
- Eras + density-adaptive past + review loops
- The "You" third tab
- Mii / Chronicle character builder (premium)
- The apartment "You" screen
- Trips (reclaims the passport metaphor)
- Past-world variants of every slide
- **ALL data wiring** — the single biggest remaining chunk

---

## Infrastructure state (see 07)
- Mapbox installed & configured; migrated to the `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
  env-var approach; secret stays in gitignored `.env`.
- EAS project created, dev build profile ready — **NOT built**. Blocked on the
  paid Apple Developer Program (£79/yr, 24–48h approval).
- Still in Expo Go and it still works (nothing imports Mapbox yet).
- Package versions aligned (expo / expo-font / expo-router bumps committed).
- `expo-camera` plugin added Aug 2026 with a real `NSCameraUsageDescription`.
  Four other iOS usage descriptions still carry autolinked boilerplate — see the
  native-permissions section of `09_CODE_NOTES.md`. Verify any of them with
  `npx expo config --type introspect --json` and grep for `Usage`.

---

## WHAT'S ACTUALLY NEXT
0. ~~The wiring pass~~ — **DONE (Sept 2026).** See the top of this file.
0a. **Day card carousel data wiring — IN PROGRESS (Sept 2026), separate from
    0 above.** Shell + Cover slide done; slides 2–6 and 8 have real
    presence/absence but sample bodies. See `03_DAY_CARD_CAROUSEL.md` §
    "DATA WIRING (Sept 2026)" and continue slide-by-slide from Capture (slide
    2) — order in that doc.
1. ~~Mount `TodayScreen` in the Present tab~~ — **DONE** (as the Today tab; see
   above). Follow-ups: bring back a progress ring on the Today tab, and
   eventually rebuild Your Days / Favourites in the new design and delete the
   dead old-Today code from `explore.tsx`.
2. **Apple Developer enrolment** (£79/yr, 24–48h) — pure waiting time, gates the
   dev build → Mapbox → slide 7. Start it early.
3. **Geo API decision** — Google Places vs Mapbox. Blocks slide 7 AND real place
   search in the Places editor.
4. ~~Port the keyboard fix~~ — **DONE** (commit `c3529e8`, all editors track
   keyboard height directly). `08` still shows the old `KeyboardAvoidingView`
   pattern in its keyboard section; tidy it when next touching that file.
5. Slide 7 LAST, after the dev build exists.
