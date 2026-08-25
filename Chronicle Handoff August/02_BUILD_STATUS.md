# CHRONICLE — BUILD STATUS

Single source of truth for what exists vs designed vs planned.
**Everything BUILT is presentation-only on sample data. NOTHING is wired to real
storage, camera, or photos yet.**

Last commit: `24efd4d` on `main`, pushed to GitHub. 23 files. Verified: no `.env`,
no `sk.`/`pk.` tokens in the committed diff.

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

### Editors (all in `components/today/editors/`)
| Editor | File | State |
|---|---|---|
| Three words | `ThreeWordsEditor.tsx` | Built. Emoji-suggested-from-words confirmed working. |
| Sound | `SoundEditor.tsx` | Built. **Restructured to Listen/Watch** — see below. |
| Something learned | `LearnedEditor.tsx` | Built. Shuffle + rotating questions working. |
| For future you | `FutureNoteEditor.tsx` | Built. Surfaced-note card + when-picker + question toggle. |
| People | `PeopleEditor.tsx` | Built. Tag / search / add-new confirmed working on device. |
| Places | `PlacesEditor.tsx` | Built — **BUT see the verification note below.** |

Six throwaway preview routes exist (`app/*-editor-preview.tsx`).

---

## ⚠️ VERIFY FIRST — Places editor state
A detailed fix-and-extend prompt was written at the very end of the last session,
but it is **not confirmed that Fable ran it before Jack committed**. Open the
Places preview:

- If the type row shows **Home / Visited / Meaningful** → the rework was NOT
  applied. Run the spec in `08_EDITOR_BUILD_SPECS.md`.
- If it shows **eight category chips + a separate star toggle** → it was applied.

The rework covers: sheet height 92% (others are 78%), fixed chrome so content
stops scrolling under the title, type picker only appearing on add-intent, eight
categories replacing three types, "meaningful" as a separate toggle, and a
merge-into-existing-place option.

---

## ⚠️ TEMP STATE COMMITTED — revert before launch
- `app/_layout.tsx` boots the app straight into a preview route (currently
  `/places-editor-preview`) instead of onboarding/tabs.
- All `app/*-preview.tsx` routes are throwaway scaffolding.
Both are flagged in the commit message. Fine to leave while reviewing editors.

---

## DESIGNED and approved, NOT built
| Thing | Notes |
|---|---|
| **Capture editor** | Approved Stitch mock. Fable prompt NOT written. HARD — real camera. |
| **Story editor** | Approved Stitch mock. Fable prompt NOT written. HARD — voice recording. |
| **Slide 7 "Who and where"** | Map-led route object. Deferred behind Mapbox + dev build + Apple enrolment. Build LAST. Three earlier approaches REJECTED (passport-dark, passport-cream, notebook) — do not retry. |

---

## NEEDS UPDATING because of decisions made last session
- **`SlideSound.tsx`** currently tap-swaps between *music* and *film*. The Sound
  editor is now **Listen / Watch**, where Listen covers songs + podcasts and Watch
  covers films + TV. The slide needs a small update to display all four media
  types. Not a blocker — do it in the wiring pass.
- **`SlideStory.tsx`** body text should use Fraunces serif to match the Story
  editor (diegetic exception #4). Check whether it already does.

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
