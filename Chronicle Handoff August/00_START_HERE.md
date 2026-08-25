# CHRONICLE — SESSION HANDOFF (read this first)

Updated: August 2026. This set REPLACES the July 2026 handoff folder
(`Chronicle Hand OFF/` in the repo). Read in order.

---

## The one-line status
Chronicle is mid-UI-overhaul. **All 8 day-card slides are designed (7 built).
All 8 editors are now DESIGNED, and 6 of them are BUILT and pushed.** Everything
built is presentation-only on sample data — nothing is wired to real storage,
camera, or photos yet.

## Where the last session ended
Last commit: **`24efd4d` on `main`** (pushed to GitHub, verified no secrets).
Jack then went away for three weeks. The project is in a clean committed state.

⚠️ **TWO THINGS TO DO BEFORE ANYTHING ELSE — see 02_BUILD_STATUS.md:**
1. The temp redirect in `app/_layout.tsx` still boots the app straight into
   `/places-editor-preview` instead of onboarding/tabs. Must be reverted before
   launch. It is fine to leave while still reviewing editors.
2. **Verify whether the Places editor rework was applied before the commit.**
   A detailed fix-and-extend prompt (92% sheet height, 8 categories, separate
   "meaningful" toggle, merge-into-existing-place, scroll/header fix) was written
   but it is NOT confirmed that Fable ran it before Jack committed. Open the
   Places preview and check for eight category chips vs three. If it shows
   Home/Visited/Meaningful, the rework still needs running — the full spec is in
   08_EDITOR_BUILD_SPECS.md.

---

## The files, in reading order
1. **00_START_HERE.md** — this file
2. **01_DESIGN_SYSTEM.md** — the locked design language, two worlds, the
   physical-object rule, all styling rules. The foundation everything obeys.
3. **02_BUILD_STATUS.md** — exactly what is built / designed / planned. The
   single source of truth for "where are we".
4. **03_DAY_CARD_CAROUSEL.md** — all 8 slides, designs, build state, code notes.
5. **04_TODAY_AND_EDITORS.md** — the Today screen and all 8 editor designs.
6. **08_EDITOR_BUILD_SPECS.md** — the AS-BUILT shared editor chrome + exact
   per-editor specs. Read this before building or changing any editor.
7. **05_ROADMAP_UNBUILT.md** — everything discussed but not built: note-vault
   loop, dashboard, events/tagging, eras, Mii avatars, trips, wiring.
8. **06_METHODOLOGY.md** — how we work (Stitch → spec → Fable pipeline), the
   two-round Stitch rule, why the last full restyle failed.
9. **07_INFRASTRUCTURE.md** — Mapbox / EAS / Apple / API decisions / packages.

---

## The most important single idea
**Every slide is a physical object.** Globe, polaroid, album-in-a-stereo,
newspaper, BeReal pair, ruled notebook page. The screens that felt premium each
had ONE dominant physical thing. The screens that felt "AI-generated" were
generic bordered boxes. This rule governs the whole app.

## The second most important idea
**One dominant element per screen.** Every screen that failed repeatedly had
three or four things competing. Every screen that worked first time had a single
hero with quiet supporting controls.

---

## What to do next (recommended order)
1. **Verify the Places editor state** (above) and revert or keep the redirect.
2. **Build the Capture editor** — design approved, Fable prompt NOT yet written.
   Hard: real camera. See 04 + 08.
3. **Build the Story editor** — design approved, Fable prompt NOT yet written.
   Hard: voice recording. See 04 + 08.
4. **Apple Developer Program enrolment** (£79/yr, 24–48h approval) — this gates
   the dev build, which gates Mapbox, which gates slide 7. Start it early; it is
   pure waiting time.
5. **Resolve the geo API decision** (Google Places vs Mapbox for place search) —
   currently blocking slide 7 and real place search in the Places editor.
6. **THE WIRING PASS** — the single biggest remaining chunk. Connect Today
   screen → editors → real `DayEntry` storage → tiles reflect saved state.
7. Slide 7 (map) LAST, after the dev build exists.
8. App Store listing copy, screenshots, privacy policy page.

---

## Critical technical rules that must never be violated
1. Custom tabBar component only — never `tabBarIcon` in `_layout.tsx`
2. Always `formatDateKey()`, never `toISOString().split('T')[0]`
3. Append `T12:00:00` when parsing dateKey strings back to Date
4. Use `localUri` from `getAssetInfoAsync` for MediaLibrary photos
5. Never stack independent modals — nest child modals in parent JSX
6. Selfie capture: `ImageManipulator` with `FlipType.Horizontal`, not CSS scaleX
7. Use in-app `CameraView`, not `ImagePicker.launchCameraAsync` (avoids the
   native iOS confirmation-screen inversion bug)
8. `expo-av` retained for voice memos (migration to expo-audio deferred)
9. All new `DayEntry` fields guarded for `undefined`
10. All new code imports from `constants/chronicleTheme.ts` — no hardcoded values
11. **Always commit before a large Fable run.**
