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
    _layout.tsx       — custom tab bar layout
    index.tsx         — The Past screen
    explore.tsx       — The Present screen
    selfie.tsx        — Daily selfie screen
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

### The Present / Selfie (unchanged)
- **The Present background:** `#090d14` (dark blue tint)
- **Selfie background:** `#0d0d0d` (neutral dark)
- **The Present accent:** `#4a90d9` (blue)
- **Danger:** `#ff4444`
- **Capsule gold:** `#f5c842`
- **Glass modal box (The Present):** `rgba(10,14,22,0.98)` with `rgba(74,144,217,0.15)` border

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
Header: "The Past" (Fraunces 32) left, gear icon right → `router.push('/settings')`.
Tab pills: active `rgba(155,114,255,0.18)` bg + `rgba(155,114,255,0.35)` border, fontSize 11.

---

### On This Day
- Year cards — height 230, borderRadius 18, `#1e1535` bg, border `rgba(155,114,255,0.3)`, shadow
- Photo fill at opacity 0.88 + gradient `['rgba(13,10,20,0.18)', 'transparent', 'rgba(10,5,20,0.82)']`
- **Ghost year watermark** top-right (Fraunces 108, `rgba(155,114,255,0.08)`, pointerEvents none)
- Small year badge pill top-left; divider + day name/date + photo count bottom bar
- **Empty year rows** (height 80) shown for gap years between oldest photo year and last year
- Tap year card → **openTradingCard(dateKey, year)** — NOT a day detail modal

### THE TRADING CARD (core day view)
Full-screen Modal, `presentationStyle="pageSheet"`, `#17102a` bg. Opens from year cards, vault calendar days, person profile days, and place profile linked days. Replaced the old day detail modal AND vault day modal entirely.

Layout (ScrollView):
1. **Header** — chevron-down close (top-left), purple "Save" pill (top-right) → `saveTradingCard()`: sets `saved_day_`, `tc_description_`, `tc_location_` keys, closes, reloads vault
2. **Date block** — day of week (Fraunces 16) + "14 June 2019" (Fraunces 38)
3. **Info strip** — weather pill (from news cache), tappable location pill (inline TextInput edit), "In Vault" badge if saved
4. **Photos** — one card per photo (aspectRatio 4/3): tap → fullscreen; ⋯ menu (set cover / hide / share / copy caption); Cover badge; "Save just this photo" row (`tc_single_photo_` key); action row: Add context (caption) | Tag people | Add to place — icons turn purple when filled; caption + people chips below
5. **Description** — "What were you doing?" multiline input, auto-saves with 500ms debounce to `tc_description_`
6. **Context fields** — "Where you were", the 5 DayContext rows, BlurView editor
7. **News feed** — "The World That Day": Wikipedia on-this-day events (filtered to year−25..year+5, max 5 + 1 birth), ⚽ Football section with inline toggle Switch (football-data.org, rate-limit aware via `football_requests_available`/`football_reset_time`), historical weather card (Open-Meteo archive API + expo-location). All cached 30 days under `news_cache_${dateKey}`

All child modals (photo menu, fullscreen, caption, tag people, add-to-place, context field) are **nested inside the trading card Modal JSX**. The add-to-place picker has a "Just this photo | The whole day" scope toggle and an **inline create-place mini form** (not the root create modal — avoids stacking sibling modals).

---

### Your Vault
- **Year picker strip** — active pill `rgba(155,114,255,0.25)` bg
- **BeReal-style portrait card calendar** — see Calendar section below; month headers Fraunces 22
- Tap a saved day → **openTradingCard(dateKey, year)** (old vault day modal removed)
- Vault includes days from `day_context_`, `saved_day_`, `caption_` keys; thumb falls back to `tc_single_photo_` asset

---

### Your Places — MAP + LIST
Two views toggled by a Map | List segmented pill (absolute top-right). Default: **Map**.

**Map view** (react-native-maps, `mapType="mutedStandard"`, `showsUserLocation`):
- Custom Marker per place with lat/lon: coloured name bubble + triangle pointer (`PIN_COLOURS`: home purple, visited blue, meaningful amber)
- Tap marker → bottom card (absolute bottom 100): name, location, type pill, chevron → Place Profile; X to dismiss (FAB hides while card is shown)
- **Search bar** (absolute top, left of toggle) → Nominatim with 400ms debounce, `User-Agent: ChronicleApp/1.0` header required; results dropdown; tap result → animate map + open Create Place pre-filled with name/location/lat/lon

**List view**:
- Empty state: map icon + "Your Places" + three coloured add buttons (Add a Home / Add a Trip / Add a Meaningful Place) that pre-set the type
- Non-empty: 🏠 Homes / ✈️ Places I've Been / ❤️ Places That Matter sections (headers in category colour), place cards height 180 borderRadius 16
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
- `person_photo_${name}` — URI string for person profile photo
- `person_desc_${name}`, `person_since_${name}`, `person_bday_${name}`, `person_phone_${name}`, `person_insta_${name}`, `person_notes_${name}` — person about fields
- `places` — JSON array of Place objects (now with latitude/longitude)

---

## Screen 2 — The Present (explore.tsx)

### Purpose
Daily journal screen. Documents today so it becomes a flashback in the future.

### Three tabs: Today | Your Days | Favourites

### Today Tab
- Selfie card → navigates to selfie screen (AnimatedCard)
- Main photo + extra photos strip (in-app CameraView, not native camera)
- Mood selector (5 emoji) + day description
- Weather card (Open-Meteo API)
- Voice memo card
- Today's Highlight, What I Learned, Today's Song (all AnimatedCard)
- **Who I Was With** — people tagging with chips, autocomplete (BlurView modal)
- Daily reminders (notification toggle — no test button)
- **Future Capsules section**: sealed/ready-to-open capsules, reveal modal, create modal

### Your Days Tab
- Same portrait card calendar as Vault (calSlot/calCard two-layer structure)
- `CAL_SLOT_WIDTH = Math.floor((width - 32) / 7)` — separate constant from index.tsx
- `LinearGradient` imported from `expo-linear-gradient` (added this session)
- Filled = has `photoUri`; empty = no photo (entry may exist but shows empty card style)
- Week day headers: MON TUE WED THU FRI SAT SUN, fontSize 9, white bold

### Favourites Tab
- Category filter pills: All, Song, Movie/TV, Book, Restaurant, Recipe, Place
- Floating + button → Add Favourite modal (BlurView)

### DayEntry Type
```typescript
type DayEntry = {
  mood: string; dayDescription: string; weatherEmoji: string;
  weatherDescription: string; weatherTemp: number; photoUri: string;
  extraPhotos: string[]; highlight: string; learned: string;
  songName: string; songRating: number; songMeaning: string;
  withWho: string; taggedPeople: string[]; voiceMemoUri: string;
  openedCapsules: { id: string; message: string; photoUri: string; createdDate: string }[];
};
```

### AsyncStorage Keys (The Present)
- `day_entry_${dateKey}` — JSON DayEntry object
- `favourites` — JSON array of Favourite objects
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

## Session Summary (July 2026 — index.tsx overhaul)

### index.tsx — complete rewrite (~2540 lines)
- **New design system**: `#17102a` background, `#1e1535` cards, Fraunces display font, purple-tinted borders throughout. Old `#6b35d4`/`#0d0a14` backgrounds gone
- **Trading card** built — the core day view. Replaces the old day detail modal AND vault day modal. Opens from year cards, vault calendar, person profile days, place profile linked days. Photos + captions + tags + places + description + context + "The World That Day" news feed (Wikipedia / football / historical weather, cached 30 days)
- **Year cards** redesigned: 230px, ghost year watermark, small badge, divider bottom bar, empty-year rows for gaps
- **Places tab rethought**: Map view (react-native-maps custom pins, Nominatim search, bottom card) + List view (empty state with 3 coloured add buttons); `Place` type gained `latitude`/`longitude`
- **Friends → People**: expanded person profile (about fields, birthday yearly notification, days together, photos together)

### New files / config
- `app/settings.tsx` — news feed toggles (football/wikipedia/weather)
- `.env` (gitignored) — `EXPO_PUBLIC_FOOTBALL_API_KEY`
- Installed `react-native-maps`

### Removed
- Old day detail modal, vault day modal, vault context edit modal (trading card covers all)
- Dead `allPrompts`/`getPromptForDate` code

*Chronicle is functional and running on iOS via Expo Go. All core screens complete. Next up: privacy policy page, then TestFlight.*
