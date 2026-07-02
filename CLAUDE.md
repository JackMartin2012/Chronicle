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

---

## App Structure
```
app/
  _layout.tsx         — root layout, checks onboarding_complete flag
  onboarding.tsx      — 4-slide onboarding (already built)
  (tabs)/
    _layout.tsx       — custom tab bar layout
    index.tsx         — The Past screen
    explore.tsx       — The Present screen
    selfie.tsx        — Daily selfie screen
```

---

## Colour System
- **The Past background:** `#0d0a14` (dark purple tint)
- **The Present background:** `#090d14` (dark blue tint)
- **Selfie background:** `#0d0d0d` (neutral dark)
- **Cards:** `#1a1a1a`
- **Borders:** `#2a2a2a`
- **The Past accent:** `#9b72ff` (purple)
- **The Present accent:** `#4a90d9` (blue)
- **Text primary:** `#ffffff`
- **Text secondary:** `#cccccc`
- **Text muted:** `#666666` / `#555555`
- **Danger:** `#ff4444`
- **Capsule gold:** `#f5c842`
- **Glass modal box (The Past):** `rgba(18,14,26,0.98)` with `rgba(155,114,255,0.15)` border
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
Shows photos from this exact date in previous years. Lets the user add context, captions, tag people, save days to Vault, document places, and browse friends.

### Four tabs: On This Day | Vault | Places | Friends
(Tab button labels shortened to fit 4 across; fontSize 12)

---

### On This Day
- Year cards — full bleed photo background, ~45% screen height, purple border
- Wrapped in **AnimatedCard** (scale on press)
- **LinearGradient overlay**: `['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.75)']`
- Purple year badge top centre, date + photo count bottom row
- Tap year card → Day Detail modal

### Day Detail Modal
- Hero photo, purple year badge + date
- **"Save Day to Vault"** button
- **Context section** — 5 tappable fields (WHERE I WAS LIVING, WHAT I WAS DOING, WHO I WAS WITH, WHAT I WAS LISTENING TO, WHAT I WAS THINKING ABOUT)
- **Photos section** — ⋯ three dot menu → Hide, Set as cover, Share, Copy caption
- All nested modals use **BlurView pattern**

---

### Your Vault
- **Year picker strip** — horizontal scroll of year pills
- **BeReal-style portrait card calendar** — see Calendar section below
- Vault populated from `day_context_`, `saved_day_`, `caption_` keys

### Vault Day Modal
- Hero photo, bold date, mood/weather chips, context fields, present journal answers, photo strip
- **"Add to place" row** in actions — shows linked place name (purple) or "📍 Add to a place" (muted)
  - Tapping opens a nested BlurView picker listing all places; also has "Create new place" option
- **Edit context button** → reloads fresh context from AsyncStorage before opening

---

### Your Places (NEW)
Three sections in a ScrollView:
- 🏠 **Homes** — places where `type === 'home'`, sorted by startDate ascending
- ✈️ **Places I've Been** — `type === 'visited'`
- ❤️ **Places That Matter** — `type === 'meaningful'`

**Place card** (AnimatedCard, height 180, borderRadius 14):
- Cover photo fills card; LinearGradient overlay bottom 70%
- Type badge top-right; name/location/date bottom-left; photo count bottom-right
- No cover photo: `rgba(255,255,255,0.06)` background with faint border
- Tap → Place Profile modal

**Floating + FAB** (bottom 100, right 20) → Create Place modal

**Create Place modal** (BlurView, slide up):
- Type picker pills: Home / Visited / Meaningful
- Name input (label changes by type)
- Location input (optional)
- Cover photo picker (ImagePicker)

**Place Profile modal** (`presentationStyle="pageSheet"`, full screen, `#0d0a14` background):
- Cover header height 280: photo fill + gradient + close button (chevron-down) + type badge + name/location/date
- Context fields section (fields differ by type — see `placeContextFields` constant)
- Photos section: horizontal strip of thumbnails + add button
- Linked days section: vault days in `place.dayKeys`, tap to open vault day modal
- Context field editor nested inside (BlurView)

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
  startDate?: string; endDate?: string;
  coverPhotoUri: string; photoUris: string[];
  dayKeys: string[]; context: PlaceContext;
};
```

**AsyncStorage key:** `places` — JSON array of Place objects

---

### Your Friends
- Grid of person cards (avatar/initial, name, days count)
- Empty state: "People you tag in your photos will appear here."
- Tap → Person Profile modal (full screen)
- Person profile: large photo or initial, name, days together, photos grid
- Tap avatar → pick profile photo from camera or library
- Stored as `person_photo_${name}` in AsyncStorage

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
- `hidden_photos` — JSON array of hidden asset IDs
- `cover_photos` — JSON object {year: assetId}
- `person_photo_${name}` — URI string for person profile photo
- `places` — JSON array of Place objects

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

## Session Summary (July 2026)

### Tab bar (_layout.tsx)
- Replaced native React Navigation tab bar with fully custom `CustomTabBar` component using `tabBar` prop
- BlurView frosted glass background, pill highlight on active tab, `usePathname()` for active detection
- Fixed repeated iOS icon slot collapse bug — custom `tabBar` is now the permanent solution

### index.tsx — The Past
- **4-tab layout**: On This Day | Vault | Places | Friends (was 2 tabs)
- **Vault calendar** redesigned multiple times → final: two-layer `calSlot`/`calCard` structure, portrait 3/4 cards, `(width-32)/7` slot width, `86%` inner card, filled/empty/today variants
- **Your Friends tab**: moved People bubbles here from Vault; grid of person cards
- **Your Places tab** (new): Homes / Places I've Been / Places That Matter, AnimatedCard place cards, Create Place modal, Place Profile full-page modal with context fields / photos / linked days
- `Place` and `PlaceContext` types; `places` AsyncStorage key
- Vault day modal: "Add to place" action with nested BlurView place picker

### explore.tsx — The Present
- Your Days calendar redesigned to match vault calendar exactly (calSlot/calCard)
- `LinearGradient` imported; `CAL_SLOT_WIDTH` constant; MON–SUN full headers
- Filled day = has `photoUri`; image fill + bottom gradient + day number bottom-left

*Chronicle is functional and running on iOS via Expo Go. All core screens complete. Next up: privacy policy page, then TestFlight.*
