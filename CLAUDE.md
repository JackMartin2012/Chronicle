# Chronicle — Project Context (Updated July 2026)

## What is Chronicle?
Chronicle is a React Native / Expo iOS app for documenting memories and life. The core concept is the **time loop** — what you capture today becomes a flashback in the future. Tagline: *"We have all these pictures for a reason."*

The app connects your past (photos from this date in previous years) with your present (daily journal) so that future-you can look back on who you were.

---

## Developer
- **Name:** Jack Martin
- **Experience:** University student, zero prior coding experience before this project
- **Device:** MacBook Air 2020 (slow), iPhone for testing
- **Project location:** `~/Chronicle` (i.e. `/Users/jackmartin/Chronicle`)
- **Testing:** Expo Go via ngrok tunnel (`npx expo start --tunnel`)
- **GitHub:** github.com/JackMartin2012/Chronicle
- **Node:** v24.15.0

---

## Tech Stack
- React Native + Expo SDK 54
- expo-router (file-based routing)
- AsyncStorage (@react-native-async-storage/async-storage)
- expo-media-library (camera roll access)
- expo-camera, expo-image-picker
- expo-location (for weather)
- expo-av (voice memos — deprecated in SDK 54 but still works, migration pending)
- expo-notifications
- expo-linear-gradient (used on year cards in index.tsx, place cards, calendar gradients)
- expo-blur (used on all bottom-sheet modals across all files)
- @expo/vector-icons (Ionicons)
- expo-haptics (mood slider ticks, save-day success)
- react-native-svg (day completeness ring on The Present header)
- react-native-maps (Places map view — Apple Maps in Expo Go on iOS)
- @expo-google-fonts/fraunces (display font on The Past — weights 300/400/600/800)
- `.env` (gitignored): `EXPO_PUBLIC_FOOTBALL_API_KEY` for football-data.org

---

## App Structure
```
app/
  _layout.tsx         — root layout, checks onboarding_complete flag
  onboarding.tsx      — 4-slide onboarding (already built)
  settings.tsx        — Settings screen (news feed toggles)
  (tabs)/
    _layout.tsx       — custom tab bar layout (labels: "Your Past" / "Your Present")
    index.tsx         — Your Past screen
    explore.tsx       — Your Present screen
    selfie.tsx        — thin wrapper: renders <DailySelfie standalone /> (kept for old links)
components/
  DayCard.tsx         — SHARED swipeable day carousel (replaces trading card); exports hashUri()
  DailySelfie.tsx     — Daily Selfie feature (4th tab in Your Present + selfie.tsx route)
  newsFeed.ts         — shared Wikipedia/football/weather/GDELT-headlines fetch + 30-day cache
```

---

## Colour System

### The Past (index.tsx + settings.tsx) — overhauled July 2026
- **Background:** `#17102a` (visibly purple-black)
- **Card background:** `#1e1535`
- **Purple accent:** `#9b72ff`
- **Border default:** `rgba(155,114,255,0.25)` / **active:** `rgba(155,114,255,0.45)`
- **Text primary:** `#ffffff`
- **Text secondary:** `rgba(255,255,255,0.65)` / **muted:** `rgba(255,255,255,0.35)`
- **Ghost watermark:** `rgba(155,114,255,0.08)`
- **Divider:** `rgba(155,114,255,0.2)`
- **Pin colours:** home `#9b72ff`, visited `#4a90d9`, meaningful `#f0b429` (`PIN_COLOURS` constant)
- **Glass modal box:** `rgba(24,16,42,0.98)` with `rgba(155,114,255,0.15)` border
- **Fraunces font** on: "The Past" title, year numbers/badges, trading card date + section headers, people names, month headers, place names

### Your Present (explore.tsx) — palette fixed July 2026
- **Background:** `#0b1526` (visibly blue-black — the original `#08090f` read as near-invisible black next to Your Past's purple, so it was replaced)
- **Card background:** `#101c33`
- **Blue accent:** `#4a90d9` (rgba form: 74,144,217)
- **Border default:** `rgba(74,144,217,0.22)` / **filled/active:** `rgba(74,144,217,0.35)`
- **Capsule gold:** `#f5c842` — used ONLY for Future Capsules, nothing else
- **Ghost watermark:** `rgba(74,144,217,0.08)`
- **Space Grotesk** on: "Your Present" title, section/question headers, month headers, favourite names
- **Glass modal box:** `rgba(16,28,51,0.98)` with `rgba(74,144,217,0.15)` border
- Screen title/tab label display text is **"Your Past" / "Your Present"** (renamed from "The Past"/"The Present"); internal file names, variable names, and AsyncStorage keys are unchanged

### Selfie (unchanged)
- **Selfie background:** `#0d0d0d` (neutral dark)
- **Danger:** `#ff4444`

---

## UI Patterns (implemented across all files)

### AnimatedCard component
All tappable cards use this — paste near top of each file, after type definitions:

```typescript
const AnimatedCard = ({ onPress, style, children }: {
  onPress: () => void; style?: any; children: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, {
    toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4,
  }).start();
  const onPressOut = () => Animated.spring(scale, {
    toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4,
  }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        activeOpacity={1} style={{ flex: 1 }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
```

### BlurView modal pattern
All transparent bottom-sheet modals:
```tsx
<Modal visible={...} animationType="slide" transparent>
  <View style={styles.modalOverlay}>
    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
      <View style={styles.modalBox}>
        {/* content */}
      </View>
    </KeyboardAvoidingView>
  </View>
</Modal>
```
`modalOverlay` has **NO backgroundColor** — BlurView provides the darkening.

---

## Tab Bar (_layout.tsx) — CUSTOM IMPLEMENTATION

The tab bar uses a **fully custom `tabBar` component** via the `tabBar` prop on `<Tabs>`. This bypasses React Navigation's internal icon slot system entirely (which had repeated layout collapse bugs on iOS).

Key points:
- `usePathname()` from expo-router detects active tab
- `useSafeAreaInsets()` for iPhone home indicator clearance with `|| 16` fallback
- BlurView provides frosted glass background
- Pill highlight on active tab icon (`rgba(0,0,0,0.5)` background)
- Two tabs: **The Past** (purple `#9b72ff`) and **The Present** (blue `#4a90d9`)
- selfie screen has `href: null` so it never appears in the tab bar

**Critical rule:** Never go back to using `tabBarIcon` prop — it cannot reliably handle custom View wrappers with padding on iOS. The custom `tabBar` component is the only stable solution.

---

## Screen 1 — The Past (index.tsx)

### Purpose
Shows photos from this exact date in previous years. Lets the user add context, captions, tag people, save days to Vault, document places on a map, and browse people.

### Four tabs: On This Day | Vault | Places | People
Header: "Your Past" (Fraunces 32) left, gear icon right → `router.push('/settings')`.
Tab pills: active `rgba(155,114,255,0.18)` bg + `rgba(155,114,255,0.35)` border, fontSize 11.

---

### On This Day
- Year cards — height 230, borderRadius 18, `#1e1535` bg, border `rgba(155,114,255,0.3)`, shadow
- Photo fill at opacity 0.88 + gradient `['rgba(13,10,20,0.18)', 'transparent', 'rgba(10,5,20,0.82)']`
- **Ghost year watermark** top-right (Fraunces 108, `rgba(155,114,255,0.08)`, pointerEvents none)
- Small year badge pill top-left; divider + day name/date + photo count bottom bar
- **Empty year rows** (height 80) shown for gap years between oldest photo year and last year
- Tap year card → **openDayCard(dateKey)** — opens the shared DayCard carousel
- **Archive card** at the bottom (dashed border, 📜 ghost) → full-page this-day-in-history modal (events before your photos began / births / deaths / holidays, cached under `archive_cache_${MM-DD}`)

### DAYCARD (components/DayCard.tsx — SHARED, replaces the trading card)
Full-screen Modal, `pageSheet`, horizontal paging FlatList with animated pagination dots (active dot stretches to 20px). Props: `dateKey`, `accent: 'past' | 'present'`, `visible`, `onClose`, `onOpenDate`. Exports `hashUri(uri)` (djb2→base36) for keying ImagePicker-URI captions.
- accent 'past' → `#17102a` bg, `#1e1535` cards, purple, Fraunces headers
- accent 'present' → `#0b1526` bg, `#101c33` cards, blue, Space Grotesk headers
- **Unsaved past days open directly in EDIT mode** with a prominent "Save to Vault" pill (Edit toggle hidden until saved). Saving writes `saved_day_` + `tc_description_` + `tc_location_` + `tc_thumb_` + `day_summary_{dateKey}` (aggregated {people, categories, location}) and drops back to view mode. Saved past days and present days open in view mode with the Edit toggle
- **COVER (past)**: "ON THIS DAY IN {year}" + huge Fraunces date, weather/photo-count/In-Vault pills, aggregated "👥 With ..." line (people tags + Family/Friends categories, falls back to day-context 'with'), 📍 location line, hint "Swipe to add your story →" in edit mode
- **COVER (present)**: weekday caps + date, threeWords BIG (24/800 accent), pills, mini 4-thumb strip, ghost mood watermark
- **PER-PHOTO SLIDES** — every visible photo gets its own slide ("Photo 2 of 5" header, 90%-width contain image ≤55% screen height, tap → fullscreen). Asset-backed photos: ⋯ menu (cover/share/copy/hide) + 💬 CAPTION / 👥 WHO'S IN THIS / 📍 WHERE rows (tappable in edit mode). Present entry photos (ImagePicker URIs): caption row only, stored at `caption_{hashUri(uri)}`. Cover photo's slide first; hidden photos don't render
- Tag people modal has **Family/Friends quick-tag chips** → `photo_tags_{assetId}` (JSON array, separate from names)
- **YOUR DAY** slide unchanged (pull-quote, voice memo, labelled blocks, 5 context fields)
- **THE WORLD**: header "What was happening in the world"; sections 📰 Headlines (GDELT via newsFeed.ts, inline toggle like football) / 📅 On this day in history / ⚽ Football / 🌤 Weather; past accent always, present only if saved
- **ONE YEAR AGO** renders for accent 'present' ONLY
- All child modals nested inside the DayCard Modal JSX; tag-people confirms before adding brand-new names
- index.tsx opens it from year cards / vault days / person profile days / place linked days; explore.tsx from Your Days calendar + Save Day button

---

### Your Vault
- **Year picker strip** — active pill `rgba(155,114,255,0.25)` bg
- **BeReal-style portrait card calendar** — see Calendar section below; month headers Fraunces 22
- Tap a saved day → **openDayCard(dateKey)** (shared DayCard carousel)
- Vault includes days from `day_context_`, `saved_day_`, `caption_` keys; thumb falls back to `tc_single_photo_` / `tc_thumb_` assets, then a MediaLibrary date query

---

### Your Places — MAP + LIST
Two views toggled by a Map | List segmented pill (absolute top-right). Default: **Map**.

**Map view** (react-native-maps, `mapType="mutedStandard"`, `showsUserLocation`):
- Custom Marker per place with lat/lon: coloured name bubble + triangle pointer (`PIN_COLOURS`: home purple, visited blue, meaningful amber)
- Tap marker → bottom card (absolute bottom 100): name, location, type pill, chevron → Place Profile; X to dismiss (FAB hides while card is shown)
- **Search bar** (absolute top, left of toggle) → Nominatim with 400ms debounce, `User-Agent: ChronicleApp/1.0` header required; results dropdown; tap result → animate map + open Create Place pre-filled with name/location/lat/lon

**List view**:
- Empty state: map icon + "Your Places" + three coloured add buttons (Add a Home / Add a Trip / Add a Meaningful Place) that pre-set the type
- Non-empty: 🏠 Homes / ✈️ Trips / ❤️ Places That Matter sections (headers in category colour); place cards height `min(28% screen, 220)`, horizontal scroll when >1 in a category; each card has a ⋯ button (top-left) → BlurView action sheet: Edit details (opens profile) / Delete place (confirm)
- + FAB (bottom 100, right 16) in both views

**Create Place modal** (BlurView, slide up): type pills, name, location, cover photo picker; saves lat/lon when opened from a search result

**Place Profile modal** (`pageSheet`, `#17102a` bg):
- Cover header 280 + "View on Map" button (only if lat/lon set) → nested map modal
- Context fields (per-type), photos strip, linked days → tap closes profile then opens trading card (350ms delay for modal dismissal)

**Place types and context fields:**
```
home:        liveWith, chapterDescription, bestMemory
visited:     wentWith, highlight, wouldReturn
meaningful:  whyItMatters, bestMemory, whoYouAssociate
```

**Types:**
```typescript
type PlaceContext = {
  liveWith?: string; chapterDescription?: string; bestMemory?: string;
  wentWith?: string; highlight?: string; wouldReturn?: string;
  whyItMatters?: string; whoYouAssociate?: string;
};

type Place = {
  id: string; type: 'home' | 'visited' | 'meaningful';
  name: string; locationName: string;
  latitude?: number; longitude?: number;
  startDate?: string; endDate?: string;
  coverPhotoUri: string; photoUris: string[];
  dayKeys: string[]; context: PlaceContext;
};
```

**AsyncStorage key:** `places` — JSON array of Place objects

---

### Your People (renamed from Friends)
- Grid of person cards (avatar/initial, name, days count with singular/plural fix)
- People sourced from photo tags + day entry `taggedPeople` + day context `with` mentions
- Avatar fallback: initial in circle, `rgba(155,114,255,0.3)` bg
- Tap → **Person Profile modal** (`pageSheet`, `#17102a` bg):
  - Header 220: profile photo full bleed (or gradient + big Fraunces initial), gradient into bg, name (Fraunces 28), "X days documented together", chevron-down close, "📷 Edit photo" pill
  - **About** — 6 tappable fields: `person_desc_` / `person_since_` / `person_bday_` / `person_phone_` / `person_insta_` / `person_notes_` (+ name suffix). Saving a birthday schedules a yearly 9am local notification
  - **Days Together** — horizontal 120×160 mini cards, tap closes profile then opens trading card
  - **Photos Together** — horizontal 80×80 thumbs, tap → fullscreen (nested modal)

---

### Vault Calendar — TWO-LAYER STRUCTURE
```
CARD_WIDTH = Math.floor((width - 32) / 7)
WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
```

Every day cell is a two-layer structure:

**Outer slot (`calSlot`):** `width: CARD_WIDTH, alignItems: 'center', marginBottom: 8` — no flex, no aspectRatio. Leading blank offset slots are just empty `<View style={styles.calSlot} />` with nothing inside.

**Inner card (`calCard`):** `width: '86%', aspectRatio: 3/4, borderRadius: 8, overflow: 'hidden'` — identical dimensions for both filled and empty.

- **Filled day** (`calCardFilled`): `borderWidth: 1.5, borderColor: '#ffffff'` + Image absolute fill + LinearGradient bottom overlay + day number absolute bottom-left with text shadow
- **Empty day** (`calCardEmpty`): `borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'` + centered muted number
- **Today** (`calCardToday`): `borderWidth: 2, borderColor: '#ffffff'`

**Critical:** Never use `flex: 1` on any cell. Both states share `calCard` as base — only contents differ. The `86%` width creates the visual gap between cards automatically.

---

### AsyncStorage Keys (The Past)
- `caption_${assetId}` — photo caption string
- `people_${assetId}` — JSON array of name strings
- `day_context_${dateKey}` — JSON DayContext object
- `saved_day_${dateKey}` — 'true' if day saved to vault
- `tc_description_${dateKey}` — trading card day description
- `tc_location_${dateKey}` — trading card day location
- `tc_single_photo_${dateKey}` — assetId when only one photo was saved for the day
- `news_cache_${dateKey}` — JSON `{fetchedAt, wikipedia, football, weather}` (30-day TTL)
- `show_football_feed` / `show_wikipedia_feed` / `show_weather_feed` — 'true'/'false' (settings screen; wiki + weather default true)
- `football_requests_available` / `football_reset_time` — rate-limit bookkeeping for football-data.org
- `hidden_photos` — JSON array of hidden asset IDs
- `cover_photos` — JSON object {year: assetId}
- `photo_tags_${assetId}` — JSON array of quick-tag categories (Family/Friends)
- `day_summary_${dateKey}` — JSON {people, categories, location} aggregated on vault save
- `caption_${hashUri(uri)}` — captions for ImagePicker-URI photos (present-day entry photos)
- `show_news_feed` — 'true'/'false' GDELT headlines toggle (settings + inline on World slide; default true)
- `person_photo_${name}` — URI string for person profile photo
- `person_desc_${name}`, `person_since_${name}`, `person_bday_${name}`, `person_phone_${name}`, `person_insta_${name}`, `person_notes_${name}` — person about fields
- `places` — JSON array of Place objects (now with latitude/longitude)

---

## Screen 2 — Your Present (explore.tsx)

### Purpose
Daily journal screen. Documents today so it becomes a flashback in the future.

### Four tabs: Today | Your Days | Daily Selfie | Favourites

### Today Tab (rebuilt July 2026 — consolidated into fewer, denser cards)
All cards: `#101c33` bg, borderRadius 16, border `rgba(74,144,217,0.22)`, marginHorizontal 16.

**Header row**: "Your Present" (Space Grotesk 32) + date + italic tagline on the left; a **DayRing** (react-native-svg, 44×44, blue progress arc, centred "X/8" label) on the right. The ring counts 8 booleans live from local + entry state: main photo, pair selfie, all 3 threeWords filled, mood set, description-or-voice-memo, daily answer, reflection answer, and any of song/watched/cooked/people/locations.

1. **HERO CAPTURE CARD** — one 340-height bordered shell replacing the old separate photo+selfie+extras cards: main photo fills it, selfie inset (92×133, white border) top-left tappable to swap (`pairSwapped`), bottom overlay row (over a gradient scrim) holds the 46×46 extras strip + "+" tile and a "X photos today" count; empty state shows two dashed prompts inside the same shell. "✍️ Tell the story of these photos →" sits just below the card — opens a BlurView captions sheet listing today's photos (56×56 thumbs + inline caption inputs, saved to `caption_{hashUri(uri)}`); these captions surface on DayCard's per-photo slides. The Daily Selfie feature moved to its own tab (components/DailySelfie.tsx, Present palette, explainer line on top, camera/grid/slideshow unchanged).
2. **THREE WORDS + MOOD** (combined card) — three chip TextInputs (`entry.threeWords`) then a redesigned **MoodSlider**: gradient-filled track, 5 stops 😞😐🙂😊🤩 that individually scale/lift/glow via `Animated.spring` when selected, tap or drag (PanResponder), `Haptics.selectionAsync()` per stop change. Saves emoji to `entry.mood`.
3. **THE JOURNAL CARD** (combined card, hairline dividers `rgba(74,144,217,0.15)`) — Section A: ✍️ Write / 🎙 Speak (dayDescription / voice memo, unchanged expo-av flow); Section B: TODAY'S QUESTION (rotating 12-question pool, `getSeededPrompt`, → `dailyQuestion`/`dailyAnswer`); Section C: **FOR FUTURE YOU** reflection in its own glowing inner container (`shadowColor #4a90d9`) — 6-question pool, seed offset +7, → `reflectionQuestion`/`reflectionAnswer`. This block is the visual centrepiece of the tab.
4. **THE DETAILS GRID** — 2-column, 6 tiles (Soundtrack 🎵 / Watched 📺 / Cooked 🍳 / People 👥 / Places 📍 / Weather ⛅), each an `AnimatedCard`. Filled tiles get `#101c33` + `rgba(74,144,217,0.35)` border and an accent label; empty tiles are faint and read "Add...". Tapping opens the field's existing flow: song → existing song modal; watched/cooked → new BlurView modals wrapping the same inline inputs (cooked keeps "Save to recipes ★", dedupes per day); people → existing tagging modal; places → new `showLocationsModal` (list + remove, nests the existing `showAddLocation` add-form modal inside it); weather is display-only (auto-fetches once, tap-to-retry only while empty).
5. **FUTURE CAPSULES** — collapsed to a single compact gold row (`capsuleRow`) showing "N sealed · next opens in X days" or "N ready to open 🎁" (row goes full gold when ready). Tapping opens a full BlurView sheet (`showCapsulesSheet`) containing the sealed/ready list, a "Seal a new capsule" button, and the daily reminders toggle in its footer; the existing create-capsule and reveal modals are nested inside this sheet's Modal (not top-level) per the no-stacked-modals rule. Reveal keeps the 1.2s gold capsule anticipation animation before the message fades in.
6. **Save today → becomes your day card** button — blue `LinearGradient` (135°-ish diagonal), persists entry, sets `saved_day_${todayKey}`, success haptic, opens DayCard (accent 'present') for today.

Legacy fields (`highlight`, `learned`) have no input UI on this tab anymore but still render in DayCard for old entries.

### Your Days Tab
- Same portrait card calendar as Vault (calSlot/calCard two-layer structure), Space Grotesk month headers, blue year pills
- Tap a day with an entry → **DayCard carousel (accent 'present')** — old day detail modal removed
- Archive filter includes any new field content (threeWords, answers, cooked, watched, locations...)

### Favourites Tab
- Category filter pills: All, Song, Movie/TV, Book, Restaurant, Recipe, Place — active `rgba(74,144,217,0.25)`
- Recipe favourites show their photo prominently (taller image)
- Floating + button → Add Favourite modal

### DayEntry Type
```typescript
type DayEntry = {
  mood: string; dayDescription: string; weatherEmoji: string;
  weatherDescription: string; weatherTemp: number; photoUri: string;
  extraPhotos: string[]; highlight: string; learned: string;
  songName: string; songRating: number; songMeaning: string;
  withWho: string; taggedPeople: string[]; voiceMemoUri: string;
  openedCapsules: { id: string; message: string; photoUri: string; createdDate: string }[];
  sealedCapsules: { id: string; openDate: string; context: string }[];
  // July 2026 extensions — ALWAYS guard for undefined (old entries):
  pairSelfieUri: string;          // BeReal pair selfie (NOT the timelapse selfie)
  threeWords: string[];           // 0 or 3 entries
  dailyQuestion: string; dailyAnswer: string;
  reflectionQuestion: string; reflectionAnswer: string;
  cookedDish: string; cookedPhotoUri: string;
  watched: string;
  locations: { name: string; withWho?: string }[];
};
```
`normaliseEntry(parsed)` fills all array/new fields with defaults — use it whenever parsing a day_entry.
```typescript
```

### AsyncStorage Keys (The Present)
- `day_entry_${dateKey}` — JSON DayEntry object (extended type, same key)
- `saved_day_${dateKey}` — 'true' set by the Save Day button (shared with The Past vault)
- `favourites` — JSON array of Favourite objects (recipes get created from What I Cooked)
- `notifications_enabled` — 'true'/'false'
- `capsules` — JSON array of Capsule objects

---

## Screen 3 — Selfie (selfie.tsx)

### Features
- Snapchat-style full-screen front camera, mirror mode
- Animated shutter button (springs down on press, bounces back)
- Today's selfie shown as hero with retake option
- "Take selfie" (camera) and "Archive one" (library) when no selfie taken
- Grid of past selfies, newest/oldest toggle
- **Slideshow mode**: auto-advance at 400ms, manual step, date label, progress bar

### AsyncStorage Keys (Selfie)
- `selfie_${dateKey}` — URI string

---

## Important Patterns To Follow
1. **Never stack independent modals** — always nest child modals inside parent modal JSX
2. **Always use `localUri`** from `getAssetInfoAsync` for displaying photos, never raw `asset.uri`
3. **Always use `formatDateKey(date)`** for date keys, never `toISOString().split('T')[0]` (timezone bug)
4. **Always append `T12:00:00`** when parsing dateKey strings back to Date objects
5. **When writing to AsyncStorage in a loop** — await each call individually
6. **BlurView modals: modalOverlay has NO backgroundColor** — BlurView handles darkening
7. **AnimatedCard requires `Animated` and `useRef`** imported in the file
8. **Tab bar: never use `tabBarIcon` with custom View wrappers** — use the custom `tabBar` component
9. **Calendar cells: never use `flex: 1`** — use fixed `width: CARD_WIDTH` on calSlot, `width: '86%'` on calCard
10. **Day views go through components/DayCard.tsx** — don't rebuild per-screen day modals; pass the right `accent`
11. **News fetching goes through components/newsFeed.ts** — one implementation of Wikipedia/football/weather + 30-day cache + rate limiting
12. **Guard every new DayEntry field** — old entries won't have them; use `normaliseEntry`
13. **expo-av stays for voice memos** — do NOT migrate to expo-audio yet

---

## formatDateKey (used in all three files)
```typescript
const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
```

---

## What Still Needs Building

### Before App Store
1. **Privacy policy page** in app
2. **App Store screenshots** + description + keywords
3. **TestFlight beta build** — needs development build (not Expo Go)
4. **Proper scheduled notifications** at 8pm (works better in dev build)
5. **expo-av migration** — migrate voice memo from expo-av to expo-audio (SDK 54)
6. **App icon** — designed (polaroid stack, purple-to-blue gradient). Copy to `assets/images/icon.png`.

### Medium Priority
7. **Selfie loading in archive grid** — old selfie URIs may not reload correctly
8. **Multiple photos per day in vault** — uncaptioned photos from same day don't appear

### Nice To Have / Future
9. **On This Day news feed** — personalised to user interests (Premium V2)
10. **Smart albums with AI tagging** (V2)
11. **Spotify / Strava integration** (V2)
12. **Recaps** — weekly/monthly/yearly (V2)
13. **Printed book export** (V2+)
14. **Future Capsule reply** — reply to past self when opening a capsule (discussed, not built)

---

## Known Warnings (non-blocking)
- `expo-av` deprecated in SDK 54 (migration deferred)
- `expo-notifications` limited in Expo Go Android (iOS unaffected)
- `expo-media-library` Android permissions warning (iOS unaffected)

---

## Commands Reference
```bash
cd ~/Chronicle                  # always cd here first
npx expo start --tunnel         # start dev server (may need 2-3 retries if ngrok fails)
git add .
git commit -m "message"
git push
```

---

## Session Summary (July 2026 — explore.tsx overhaul + shared DayCard)

### Shared components (new)
- **components/DayCard.tsx** (~1300 lines) — the swipeable day carousel that REPLACED the trading card in index.tsx. Both screens open it; accent prop switches the whole design system. Slides: cover / photos / your day / locations / the world / one year ago. Edit mode with nested BlurView editors
- **components/newsFeed.ts** — extracted Wikipedia/football/weather fetching, 30-day cache, football rate-limit bookkeeping. Both screens + DayCard use this single implementation

### explore.tsx — complete rewrite (~2110 lines)
- **New design system**: `#08090f` cold blue-black, `#0d1220` cards, Space Grotesk headers, gold reserved for capsules. Old `#1a4fd4` bright blue gone
- **DayEntry extended** (pairSelfieUri, threeWords, daily/reflection Q&A, cooked, watched, locations) — `normaliseEntry` guards old entries
- **Today tab restructured** into 14 cards (capture pair → mood slider → three words → daily question → reflection → your day → cooked → soundtrack → watched → people → locations → weather → reminders → capsules → save button)
- **Capsule reveal** got the anticipation moment: gold capsule spring-in, 1.2s, content fades in
- **Your Days** opens DayCard (present accent); old day detail modal removed

### index.tsx (~1970 lines after refactor)
- Trading card JSX/logic removed (~930 lines); `openDayCard(dateKey)` + `<DayCard accent="past">` in its place
- Earlier this month: full The Past redesign (year cards 50% height, ghost watermarks, Archive card, map Places with anchored emoji pins, People profiles, settings screen, .env football key)

### Prior session (same July 2026 arc)
- The Past design system `#17102a`/Fraunces; Places map view; Friends → People; `app/settings.tsx`; react-native-maps installed

## Session Summary (July 2026 — Present palette fix, rename, Today tab consolidation)

- **Palette bug fixed**: `#08090f`/`#0d1220` read as near-invisible black — replaced everywhere in explore.tsx with `#0b1526`/`#101c33` so Your Present reads unmistakably blue next to Your Past's purple. Card border default now `rgba(74,144,217,0.22)`, filled/active `0.35`
- **Renamed** "The Past"/"The Present" → **"Your Past"/"Your Present"** — display strings only (header titles, tab bar labels, `Tabs.Screen` titles in `_layout.tsx`); file names, variables, and AsyncStorage keys untouched
- **Today tab consolidated** from 14 separate cards down to 6 sections: header row gained a `DayRing` (react-native-svg) completeness indicator; capture pair + extras merged into one hero card shell; three words + mood merged into one card with a rebuilt gradient/glow MoodSlider; write/speak + daily question + reflection merged into one "journal card" with hairline dividers; soundtrack/watched/cooked/people/places/weather became a 2-column tap-to-open tile grid (`AnimatedCard`); capsules collapsed to a compact gold summary row that opens a full sheet with the create/reveal modals nested inside (daily reminders toggle moved into its footer)
- Installed `react-native-svg` for the ring
- No data-layer changes — all existing state, handlers, and AsyncStorage logic kept; this was layout/grouping + a bug fix only

## Session Summary (July 2026 — DayCard per-photo carousel + selfie tab)

- **DayCard**: unsaved past days open straight into edit mode with a "Save to Vault" pill; past cover is a warm "ON THIS DAY IN {year}" welcome with aggregated "With ..." line; each photo now gets its own carousel slide with caption/who/where rows; Family/Friends quick-tags (`photo_tags_`); `day_summary_` written on save; One Year Ago is present-only; present accent updated to `#0b1526`/`#101c33`
- **World slide**: GDELT live headlines (free, no key) as a 4th source with inline + settings toggle (`show_news_feed`); section sub-labels added
- **Daily Selfie** extracted to `components/DailySelfie.tsx`, recoloured to the Present palette, now the 3rd pill tab in Your Present; selfie.tsx is a thin wrapper
- **Today hero**: "Tell the story of these photos →" captions sheet (per-URI `caption_{hashUri(uri)}`) replaced the selfie link; captions surface on DayCard photo slides
- **Places list**: cards capped at min(28% screen, 220); ⋯ manage sheet per card (Edit details / Delete with confirm)
- **Year cards**: bigger badge (17pt) and bottom-bar text (15/14pt)

## Session Summary (July 2026 — design-language sweep: de-AI-template pass)

Restyle-only pass, no feature/data/navigation changes, across index.tsx, explore.tsx, DayCard.tsx, DailySelfie.tsx, settings.tsx.

- **Total font commitment**: every Text in Your Past (index.tsx, DayCard accent='past', settings.tsx) uses Fraunces; every Text in Your Present (explore.tsx, DailySelfie.tsx, DayCard accent='present') uses Space Grotesk. DayCard is shared across both accents, so it now defines a local `AccentText` wrapper (`{ fontFamily: A.font400 }` default, explicit overrides still win) applied to all ~100 Text elements in that file instead of hand-editing each one. DailySelfie had **no custom font at all** before this — added Space Grotesk + `useFonts`/`fontsLoaded` gate. TextInputs fonted too. Added `SpaceGrotesk_500Medium` (was missing from the loaded weights).
- **Boxes removed** except the 4 standing exceptions (year cards, calendar cells, place/person cover photos, DayCard photo areas). explore.tsx Today tab restructured: hero capture is full-bleed (threeWords + weather/mood/photo-count overlaid on the photo itself), mood slider + three-words input moved to open sections under the hero, the journal is one open flow (question as a statement, "Write more"/"Speak it" as text links, no boxed buttons), "For future you" is a plain block (no glow/border), the details grid became label/value list rows with hairlines, capsules collapsed to a plain two-line row (gold text only), save button is flat solid accent with a muted caption underneath. index.tsx People tab is now open avatar+name+count (no card per person); place-profile action buttons became icon+text rows; Archive teaser is an open row. DayCard's per-photo caption/who/where and "Your Day" blocks are hairline list rows; World slide news items are open rows, source as tiny muted text.
- **Emoji-as-icon purged**: only mood emoji, weather-condition emoji, and the capsule-reveal 🎁 graphic survive as genuine user-content/signature visuals. Everything else (section icons, photo-menu icons, camera chrome ✕⟳‹›▶⏸, person chips, empty-state illustrations) became Ionicons `*-outline` in muted grey — never accent-coloured.
- **Tracked-caps purged** at the data/string level (not just CSS) — field-label arrays in index.tsx and DayCard.tsx were rewritten to sentence case, not merely restyled.
- **Accent budget**: colour pulled back to active tab/toggle state, primary buttons, and DayCard's "For future you" label; borders/pills/counts/icons that were accent-tinted before are now muted white/grey.
- `privacy.tsx` doesn't exist yet in this project (still on the pre-App-Store checklist) — skipped, not part of this pass.

*Chronicle is functional and running on iOS via Expo Go. All core screens complete. Next up: privacy policy page, then TestFlight.*
