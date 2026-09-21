# CHRONICLE — EDITOR BUILD SPECS (as built)

Read this before building or modifying any editor. These are the exact values the
six built editors use. New editors copy this chrome so all eight look like
siblings — respecifying it from scratch each time is how they drift apart.

---

## THE SHARED CHROME (established by `SoundEditor.tsx`)

```
Sheet:      top corners radius 28, background #101c33
            fixed height 78% of screen  (PlacesEditor is the exception: full screen
            minus the top safe-area inset and 8px — SCREEN_H - insets.top - 8)
Grabber:    36 x 4, rgba(255,255,255,0.2), radius 2, centered, marginTop 8
Top row:    marginTop 16, paddingHorizontal 24, space-between
            left  — Ionicons "chevron-down", 24px, rgba(255,255,255,0.6)
            right — "Done", Space Grotesk SemiBold 16, #4a90d9
Title:      marginTop 20, paddingHorizontal 24, LEFT-ALIGNED
            Space Grotesk SemiBold 22, white
Input surf: #16233d  (search fields, note fields, toggle track)
Hairline:   rgba(255,255,255,0.08)
Footer:     pinned to the bottom of the sheet, hairline divider above
            completion line, 13px, rgba(255,255,255,0.4), centered
            progress row: 8 dots (5px, 6px gaps) + "This completes N of 8 for today"
                          filled #4a90d9, empty rgba(255,255,255,0.15)
Done:       THE TOP-RIGHT "Done" IS THE ONLY SAVE-AND-DISMISS CONTROL. There is NO
            big bottom Done button — do not build one (removed from all 8 editors,
            Sept 2026). Top Done is always enabled; on tap: Keyboard.dismiss(),
            light haptic if anything is filled, save to storage, dismiss.
            The chevron-down dismisses WITHOUT saving.
Freed space: the footer is just the hairline + progress note/dots, so the
            content area (flex: 1) gets the height the button used to take. It
            goes to content — never re-spend it as extra padding or margin.
Safe area:  bottom inset + 12px below the footer (12px only while the keyboard is up)
```

**Why the fixed height matters:** the first build let the sheet size to its
content, so it hugged the bottom third when empty and would have leapt upward the
moment a result was picked. Fixed height + pinned footer + scrolling middle keeps
it stable across states.

### The keyboard pattern (applied to all editors — do not omit)
```
1. Wrap sheet content in a Pressable with onPress={Keyboard.dismiss},
   accessible={false}. Must NOT block taps on real controls.
2. Content ScrollView: keyboardDismissMode="interactive"
                       keyboardShouldPersistTaps="handled"
3. Wrap the sheet in KeyboardAvoidingView
   behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
   so the footer lifts above the keyboard. (Fixed-height sheets now track
   keyboard height directly instead — see `09_CODE_NOTES.md`.)
4. Chevron-down and top-right Done both call Keyboard.dismiss() first.
5. Multiline inputs keep Return as newline — never submit.
```
Without this the user is trapped with the keyboard up and Done hidden behind it.

### Motion
Reuse the existing `AnimatedCard` component for press-scales — never build a
parallel animation helper. Mode switches and state transitions are calm
cross-fades. Reserve bounce for one deliberate moment per screen (e.g. the Sound
rating pills).

### Standard safety phrasing for any editor build
> "Presentation only, sample data, don't wire to storage/camera yet, don't modify
> existing screens. New component + throwaway preview route. Point the temp
> redirect in `_layout.tsx` at it."

---

## PER-EDITOR DATA SHAPES (as built, local state only)

```ts
// Sound
type SoundMode  = 'listen' | 'watch';
type MediaType  = 'song' | 'podcast' | 'film' | 'tv';
type SoundEntry = {
  mode: SoundMode; mediaType: MediaType;
  title: string; subtitle: string; artworkUrl: string;
  rating: number;      // 1-10, 0 = unrated
  note: string; externalId: string;
};
// state: { listen: SoundEntry | null, watch: SoundEntry | null }

// People
type Person = { id: string; name: string; photoUri?: string };

// Places (post-rework)
type PlaceCategory =
  'home' | 'someones' | 'work' | 'food' | 'outdoors' | 'sport' | 'travel' | 'other';
type Place = {
  id: string; name: string;
  category: PlaceCategory;
  meaningful: boolean;
  mergedIntoId?: string;
};

// Future note
{ note: string; when: string; isQuestion: boolean; reply: string }
```

### iTunes search endpoints (Sound editor — free, no key)
```
listen: itunes.apple.com/search?term=<q>&media=music&entity=song&limit=8   -> 'song'
        itunes.apple.com/search?term=<q>&media=podcast&limit=6             -> 'podcast'
watch:  en.wikipedia.org/w/api.php generator=search, gsrsearch=<q> film     -> 'film'
        (iTunes movie search is dead — 0 results for every title; no posters here)
        itunes.apple.com/search?term=<q>&media=tvShow&entity=tvSeason&limit=6 -> 'tv'
```
300ms debounce. `Promise.all`, merge, interleave so one type doesn't dominate.
If one request fails still show the other; only error if both fail.

Field mapping (use whichever exists):
- title → `trackName || collectionName`
- subtitle → `artistName`, EXCEPT film → `new Date(releaseDate).getFullYear()`
- artwork → `artworkUrl100` with `"100x100"` replaced by `"300x300"`
- externalId → `trackId || collectionId`

---

## PLACES EDITOR REWORK SPEC (run this if not already applied — see 02)

1. **Sheet height: full screen below the top safe-area inset** (others stay 78%).
2. **Scroll/header fix:** chrome (grabber, top row, title) is FIXED and does not
   scroll; content scrolls independently beneath with correct top padding.
   Content must never render behind the title. Footer stays pinned.
3. **Type picker only on add-intent** — not rendered until the user taps "+ Add"
   on a suggestion, a recent pill, a search result, or the add-new row. Add a "×"
   to dismiss without tagging.
4. **Eight categories** replacing the three types (label "What kind of place?"),
   chips height 34, radius 17, paddingHorizontal 12, icon 13px + label:
   ```
   home      "home-outline"        "Home"
   someones  "people-outline"      "Someone's place"
   work      "briefcase-outline"   "Work or study"
   food      "restaurant-outline"  "Food & drink"
   outdoors  "leaf-outline"        "Outdoors"
   sport     "football-outline"    "Sport"
   travel    "airplane-outline"    "Travel"
   other     "ellipsis-horizontal" "Other"
   ```
   No default — the user must pick one.
5. **Meaningful is a separate toggle** below the chips: star icon + "This place
   means something to me" + a Switch, off by default. **#4a90d9 when on — NEVER
   gold.** Tagged pills show the category icon plus a small filled star if
   meaningful.
6. **Merge into an existing place** — above the category chips: "Or is this
   somewhere you already have?" + a horizontal row of existing-place pills.
   Tapping one sets `mergedIntoId`, creates no new place, needs no category, and
   closes the picker immediately. Not rendered if there are no existing places.
7. **Explicit confirm:** tapping a category selects it but does NOT complete the
   tag; a small "Add place" button (height 40, radius 20, #4a90d9) completes it
   once a category is chosen. Merging still completes instantly.
8. Search result rows keep the neutral "location-outline" icon (category is
   unknown until picked).

Sample known places with categories: Home (home), The Rocca (food), Signal Hill
(outdoors), Otago Museum (other), Union Street (other), Port Chalmers (travel),
The Bog (food).

---

## ✅ DONE — CAPTURE & STORY (built Aug 2026)
Both are now built, both passes each. See `02_BUILD_STATUS.md` for what they do
and `CaptureEditor.tsx` / `StoryEditor.tsx` for the code.

**The two-pass approach worked and is worth reusing** for anything touching a
real device feature: build the layout against placeholders first, judge it, then
wire the hardware. It keeps the risky part isolated and means a layout problem
never gets tangled up with a permissions problem.

**⚠️ The selfie flip instruction that used to be in this section was WRONG.** It
said Capture "needs an `ImageManipulator` flip for the selfie". On expo-camera 17
`mirror={true}` on `CameraView` already handles both preview and saved file, so
an added flip double-applies and inverts the selfie. Verified on device. The
corrected rule is in `04` (Editor 7) and `00_START_HERE` rule 6 — **do not
re-add a flip.**

**What each build taught, worth carrying into the wiring pass:**
- Capture's 3:4 frame must derive its height from `aspectRatio` with the WIDTH
  capped by available space. Driving it from full-bleed width overflows every
  phone and pushes the controls off screen.
- Story's keyboard handling had to depart from the shared chrome pattern above —
  see the note there, and `09_CODE_NOTES.md`.
- A collapsing wrapper whose height depends on an `onLayout` measurement must
  collapse to a hard 0 when unmeasured. Falling back to "size normally" leaves
  an invisible element occupying full height.
