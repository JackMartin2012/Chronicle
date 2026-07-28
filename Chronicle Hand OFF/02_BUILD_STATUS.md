# CHRONICLE — BUILD STATUS

The single source of truth for what actually exists vs designed vs planned.
Everything BUILT is presentation-only on sample data unless stated — NOTHING is
wired to real storage, camera, or photos yet.

## BUILT and working on device (Expo Go)
| Component | File | Notes |
|---|---|---|
| Design tokens | `constants/chronicleTheme.ts` | Full token system |
| Centralised fonts | `app/_layout.tsx` | All fonts load once at root |
| Carousel shell | `components/daycard/DayCardCarousel.tsx` | Horizontal pager, shared top chrome + page dots that track the current page |
| Slide 1 Cover | `components/daycard/SlideCover.tsx` | Globe (real NASA image), date, weather/mood/photo row, people, pin+glow |
| Slide 2 Capture | `components/daycard/SlideCapture.tsx` | BeReal pair, tap-to-swap, press-hold-to-peek |
| Slide 3 Camera roll | `components/daycard/SlideCameraRoll.tsx` | Featured polaroid (handwriting caption) + thumbnail strip, tap to change |
| Slide 4 Three words | `components/daycard/SlideThreeWords.tsx` | Monumental words, dot affordance, tap-to-reveal reason + dim others |
| Slide 5 Story | `components/daycard/SlideStory.tsx` | Journal page (dark, ruled), fixed-height internal scroll, learned-note pinned below |
| Slide 6 Sound | `components/daycard/SlideSound.tsx` | Album art + ambient glow, 1-10 rating, reaction, tap-swap to film |
| Slide 8 Newspaper | `components/daycard/SlideNewspaper.tsx` | Masthead, columns, pull quote, handwritten reflection note |
| Today input screen | `components/today/TodayScreen.tsx` | Calm dark mosaic of tiles, partially-filled state |
| Globe asset | `assets/images/globe.png` | NASA Black Marble, cropped square + circular alpha mask |

Preview routes exist (`app/preview.tsx`, `app/today-preview.tsx`, etc.) — throwaway
screens for viewing components in isolation. A temp redirect in `_layout.tsx`
points at whichever is being reviewed.

## DESIGNED (in Stitch, approved), NOT built
| Editor | Status |
|---|---|
| Three words editor | Designed; also built once by Fable then kept presentation-only. Emoji-suggested-from-words row confirmed working. |
| People editor | Designed (search + tag + add-new, photo-later) |
| Places editor | Designed (detected-from-photos + manual add + type choice) |
| Something learned editor | Designed (needs prompt/shuffle added — see 04) |
| For future you editor | Designed (needs "when" picker + question toggle — see 04 & 05) |

## DESIGNED (in Stitch), NOT built — day card
- **Slide 7 "Who and where"** — final approved design is a MAP-LED route object
  (dark cartographic map, route line, people-on-map, stat row). Deferred: needs
  Mapbox + dev build + Apple Developer enrolment. Should be the LAST slide built.
  Three earlier approaches were REJECTED (passport-dark, passport-cream,
  notebook) — do not retry those. See 03.

## NOT designed, NOT built — editors
- Sound editor (search + rating input)
- Capture editor (camera + selfie — hard, real device feature)
- Story editor (typing + voice recording — hard, real device feature)

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
- ALL data wiring

## Infrastructure state (see 07)
- Mapbox installed & configured, tokens set, EAS project created, dev build
  profile ready — but NOT built (needs paid Apple Developer Program, £79/yr).
- Still in Expo Go and it still works (nothing imports Mapbox yet).
