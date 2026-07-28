# CHRONICLE — SESSION HANDOFF (read this first)

This folder is the complete state of Chronicle's UI overhaul as of the end of
this session (July 2026). Move all these files into the project and read them
in order when starting a new chat.

## The one-line status
Chronicle is mid-UI-overhaul. The old UI looked AI-generated; we're rebuilding
it screen by screen. Six day-card carousel slides and the Today input screen are
BUILT and working on device. Three input editors are DESIGNED. The rest is
designed-or-planned but not built. Nothing is wired to real data yet.

## The files, in reading order
1. **00_START_HERE.md** — this file
2. **01_DESIGN_SYSTEM.md** — the locked design language, the two worlds, the
   physical-object rule, all styling rules. The foundation everything obeys.
3. **02_BUILD_STATUS.md** — exactly what is built, what is designed, what is
   planned. The single source of truth for "where are we".
4. **03_DAY_CARD_CAROUSEL.md** — all 8 slides, their designs, build state, and
   per-slide code notes.
5. **04_TODAY_AND_EDITORS.md** — the Today input screen and the 8 editor sheets.
6. **05_ROADMAP_UNBUILT.md** — everything discussed but NOT built: the note-vault
   loop, the dashboard, events/tagging system, eras, Mii avatars, trips, the
   map/Mapbox work, wiring, and more.
7. **06_METHODOLOGY.md** — how we work (Stitch→spec→Fable pipeline), the Stitch
   two-round rule, the theme-tokens approach, why the last restyle failed.
8. **07_INFRASTRUCTURE.md** — Mapbox/dev-build/EAS/Apple state, API decisions,
   token safety, package versions.

## The most important single idea
**Every slide is a physical object.** Globe, polaroid, album-in-a-stereo,
newspaper, passport-page. The slides that felt premium each had ONE dominant
physical thing. The slides that felt "AI-generated" were generic bordered boxes.
This is the rule that governs the whole app. See 01_DESIGN_SYSTEM.md.

## What to do next (recommended)
The Today screen and carousel look great but are INERT — you can't actually fill
in a day. The editors are what make it usable. Finish designing the remaining
editors (sound, capture, story), then WIRE everything to real storage/camera/
photos. The map slide (7) is deferred behind Apple Developer enrolment and should
be the LAST thing.

## Critical technical rules that must never be violated
(These predate this session and still hold — see the original project CLAUDE.md
and context files too.)
1. Custom tabBar component only — never `tabBarIcon` in `_layout.tsx`
2. Always `formatDateKey()`, never `toISOString().split('T')[0]`
3. Append `T12:00:00` when parsing dateKey strings back to Date
4. Use `localUri` from `getAssetInfoAsync` for MediaLibrary photos
5. Never stack independent modals — nest child modals in parent JSX
6. Selfie capture: `ImageManipulator` with `FlipType.Horizontal`, not CSS scaleX
7. Use in-app `CameraView`, not `ImagePicker.launchCameraAsync`
8. `expo-av` retained for voice memos (migration to expo-audio deferred)
9. All new `DayEntry` fields guarded for `undefined`
