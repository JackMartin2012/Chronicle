# CHRONICLE — EDITOR BUILD SPECS (as built)

Read this before building or modifying any editor. These are the exact values the
six built editors use. New editors copy this chrome so all eight look like
siblings — respecifying it from scratch each time is how they drift apart.

---

## THE SHARED CHROME (established by `SoundEditor.tsx`)

```
Sheet:      top corners radius 28, background #101c33
            fixed height 78% of screen  (PlacesEditor is the exception at 92%)
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
Done btn:   marginTop 12, marginHorizontal 24, height 52, radius 16
            background #4a90d9, white Space Grotesk SemiBold 16
            disabled: background rgba(255,255,255,0.08), text rgba(255,255,255,0.3)
            on tap: light haptic, console.log the payload, dismiss
Safe area:  bottom inset + 12px below the button
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
   so the footer lifts and Done stays visible above the keyboard.
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
watch:  itunes.apple.com/search?term=<q>&media=movie&limit=8               -> 'film'
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

1. **Sheet height 92%** (others stay 78%).
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

## STILL TO WRITE — CAPTURE & STORY FABLE PROMPTS
Both designs are approved (see 04). Neither prompt has been written. When writing
them:

**Capture** — needs real camera permissions, an in-app `CameraView`, the camera
roll picker filtered to today, `ImageManipulator` flip for the selfie, and the
tap-inset-to-swap interaction. Consider building it in two passes: layout with
sample images first, then wire the camera — the layout can be judged without
permissions, and it keeps the risky part isolated.

**Story** — needs `expo-av` recording, a live waveform while recording, and a
playback strip. Same two-pass logic: page + serif body + static voice strip
first, then the real recording. The page must stay the hero; the voice row must
stay visibly secondary (Stitch got this right, and it's easy to lose in code by
making the player too tall).

Both are HARD relative to the six built ones — build them alone, never batched,
and commit before each run.
