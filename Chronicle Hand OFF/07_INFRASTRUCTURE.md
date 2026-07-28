# CHRONICLE — INFRASTRUCTURE STATE

## Current environment
- React Native + Expo SDK 54, expo-router, AsyncStorage, expo-media-library,
  expo-camera, expo-location, expo-av (voice memos), expo-notifications,
  expo-linear-gradient, expo-blur, @expo/vector-icons (Ionicons).
- Repo: github.com/JackMartin2012/Chronicle (PUBLIC — mind secrets).
- Dev machine: MacBook Air 2020. Testing: iPhone via Expo Go (local network
  reliable; tunnel/ngrok not).
- A `CLAUDE.md` context file auto-loads project details each Fable session. Add a
  line pointing Fable at `CHRONICLE_DESIGN_SPEC.md` / this handoff set.

## Fonts added this session
- `@expo-google-fonts/caveat` (Caveat 400) — polaroid handwriting.
- All fonts centralised into `app/_layout.tsx` (loaded once at root).

## Mapbox (installed & configured, NOT built)
- `@rnmapbox/maps` installed.
- Tokens in `.env` (gitignored): `EXPO_PUBLIC_MAPBOX_TOKEN` (public `pk.`, runtime)
  and `MAPBOX_DOWNLOAD_TOKEN` (secret `sk.`, build-time only).
- `app.config.js` reads the download token from `process.env` — the `sk.` token is
  NOT in any committed file (verified). NOTE: the config key
  `RNMapboxMapsDownloadToken` is DEPRECATED — migrate to the
  `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` env var approach (a warning prints on start; not
  breaking).
- **The `pk.` public token was pasted in chat this session** — low-risk (it's meant
  to ship in apps) but consider rotating it for tidiness given the public repo. The
  `sk.` token also surfaced in an `eas secret:create` success message — if this
  conversation is ever shared, ROTATE the `sk.` token (regenerate in Mapbox →
  update `.env` → re-run the secret with `--force`).
- **Chosen over MapLibre:** MapLibre is truly free/no-card but still needs a tile
  provider (MapTiler/Stadia) with its own key — so it just moves the signup.
  Mapbox: 25,000 free monthly active users, then ~$5/1,000 (steps down with
  volume). Card required to activate but won't charge within free limits. No hard
  spending cap — SET A BILLING ALERT (e.g. $10) as the safety net. The static-
  snapshot render design keeps usage minimal.

## EAS / dev build (set up, NOT built)
- Logged in as `jackmartin2012`. EAS project created: `@jackmartin2012/Chronicle`
  (projectId + owner committed to app.json — not secrets).
- Two EAS project secrets created: `MAPBOX_DOWNLOAD_TOKEN` and
  `EXPO_PUBLIC_MAPBOX_TOKEN`.
- `eas.json` has a `development` iOS profile (developmentClient: true, distribution
  internal). `ios.bundleIdentifier` = `com.jackmartin.chronicle` (NEVER change
  after launch).
- **BLOCKED on:** the paid Apple Developer Program (£79/yr) — a device dev build
  can't create the provisioning profile with a free Apple ID. Jack will enrol when
  the rest of the design is right. Enrolment takes 24–48h to approve.
- The build command Jack runs (interactive, needs Apple ID + 2FA):
  `npx eas-cli build --platform ios --profile development`

## The Expo Go → dev build transition (important context)
- Still in Expo Go and it STILL WORKS — because nothing IMPORTS Mapbox yet. The
  package being installed doesn't break Expo Go; only rendering a Mapbox component
  does.
- Therefore: do ALL non-map design/build in Expo Go now; the map slide (7) is the
  moment Expo Go is left behind, so it should be LAST, alongside the dev build +
  Apple enrolment.
- A dev build is YOUR OWN compiled Chronicle with native modules baked in. After
  installing it once, `npx expo start` hot-reloads into it exactly like Expo Go.
  You only rebuild when NATIVE code changes (adding a library, config) — normal JS/
  screen changes still hot-reload instantly.

## API decisions
- **iTunes Search API** — MVP, free, no key, no OAuth. Music/podcasts/film/TV;
  returns artwork + 30s preview. Terms: artwork/preview only to promote store
  content, shown near a store badge (so artwork taps through to the store). Or use
  text-only (title/artist/year) to avoid the constraint. YouTube etc. typed
  manually, no artwork. Add a privacy line: anonymous title queries to Apple.
- **HealthKit** — steps + distance ONLY (they describe a day; not workouts/HR).
  On-device, privacy-safe. Needs native module + dev build (unavailable in Expo
  Go), entitlement, usage-description, review notes. Design now (stat row renders
  whatever exists; no permission → figure absent), build later (~when the UI work
  finishes and the dev build lands).
- **Photo GPS (EXIF)** — read on-device for the location system; never uploaded.
  Add a privacy-policy line.
- **Existing:** GDELT (world headlines), Wikipedia on-this-day, Football-Data.org
  (key `EXPO_PUBLIC_FOOTBALL_API_KEY` in `.env` — repo public, verify it was never
  committed in old history via `git log -S`), Open-Meteo (weather), Nominatim
  (place search). Apple News has NO public API.
- **Android** — V2, not now. Expo makes it cheaper than a rewrite but HealthKit is
  iOS-only (Health Connect is separate), custom tab bar + permission flows need
  retesting, visual language is iOS-flavoured. One platform done well first;
  UK-student audience skews iPhone.

## Package version nudges (non-blocking)
Expo flagged: expo 54.0.34→54.0.36, expo-font 14.0.11→14.0.12, expo-router
6.0.23→6.0.24. Align with `npx expo install --check` when convenient.

## Privacy / brand invariants (never break)
- On-device storage; no accounts; no cloud; no analytics; no tracking; no ads.
- "Data Not Collected" is the App Store answer and the marketing wedge.
- Anonymous API queries (weather coords, place names, public feeds) don't count as
  collection. Keep the two privacy artifacts separate: hosted `privacy-policy.html`
  (GitHub Pages, for App Store Connect URL) and in-app `privacy.tsx`.
