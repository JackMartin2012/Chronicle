# CHRONICLE — BUILD STATUS

Single source of truth for what exists vs designed vs planned.

**Updated 25 August 2026 — all 8 editors are now BUILT.**

**NOTHING is wired to storage.** Every editor holds its input in local component
state and logs on Done; close the sheet and it's gone. That has not changed and
is still the single biggest remaining chunk of work.

What DID change: two editors are no longer presentation-only. **Capture drives
the real camera and the real camera roll. Story records real audio.** Those are
live device features on live data — they just have nowhere to save it yet.

Last commit: `e700125` on `main`, pushed to GitHub.

---

## BUILT and working on device (Expo Go)

### Foundation
| Component | File |
|---|---|
| Design tokens | `constants/chronicleTheme.ts` |
| Centralised fonts | `app/_layout.tsx` |
| Mapbox config (env-var approach) | `app.config.js` |

### Day card carousel
| # | Slide | File | Object |
|---|---|---|---|
| — | Carousel shell | `components/daycard/DayCardCarousel.tsx` | pager + chrome + dots |
| 1 | Cover | `SlideCover.tsx` | Globe (real NASA image) |
| 2 | Capture | `SlideCapture.tsx` | BeReal pair, tap-swap, hold-to-peek |
| 3 | Camera roll | `SlideCameraRoll.tsx` | Polaroid + thumb strip |
| 4 | Three words | `SlideThreeWords.tsx` | Monumental typography |
| 5 | Story | `SlideStory.tsx` | Dark ruled journal page |
| 6 | Sound | `SlideSound.tsx` | Album art + ambient glow |
| 8 | Newspaper | `SlideNewspaper.tsx` | Newspaper page |

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

Eight throwaway preview routes exist (`app/*-preview.tsx`).

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

**⚠️ NO ImageManipulator flip on the selfie, deliberately.** `04` and
`00_START_HERE` both state the flip as non-negotiable. On **expo-camera 17 that
is wrong**: the `mirror` prop un-mirrors the saved file as well as mirroring the
preview, so an explicit flip applies twice and the selfie saves backwards.
Verified on device. Both code sites carry a comment. **The rule still needs
correcting at source in 04 and 00.**

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

## ⚠️ TEMP STATE COMMITTED — revert before launch
- `app/_layout.tsx` boots the app straight into a preview route (currently
  `/story-editor-preview`) instead of onboarding/tabs.
- All `app/*-preview.tsx` routes are throwaway scaffolding.
- `HAS_SAMPLE_PHOTOS` in `CaptureEditor.tsx` — dev const, currently `false`.
Fine to leave while reviewing editors. Full list in `09_CODE_NOTES.md`.

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
- **`SlideStory.tsx`** body text should use Fraunces serif to match the Story
  editor (diegetic exception #4). **Checked Aug 2026: it does NOT** — line 77
  passes `w.fontRegular`, which is Space Grotesk in the Present world. The same
  day currently renders in a different font in the editor and on the card.
- **`SlideStory.tsx` page treatment has diverged from `StoryEditor.tsx`** — the
  editor was tuned on device (28pt rules vs 36, 18px vs 16, rules at 8% vs 4%)
  and the slide was deliberately left alone. The page is meant to be ONE object
  in both places. Neither value is shared; both files declare their own. See
  `09_CODE_NOTES.md`.

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
1. **The wiring pass** — the biggest remaining chunk, and now unblocked: every
   editor exists and produces real values that go nowhere.
2. **Apple Developer enrolment** (£79/yr, 24–48h) — pure waiting time, gates the
   dev build → Mapbox → slide 7. Start it early.
3. **Geo API decision** — Google Places vs Mapbox. Blocks slide 7 AND real place
   search in the Places editor.
4. **Port the keyboard fix** from `StoryEditor.tsx` to the other six editors and
   update the pattern in `08_EDITOR_BUILD_SPECS.md` — cleaner before wiring than
   after. See `09`.
5. Slide 7 LAST, after the dev build exists.
