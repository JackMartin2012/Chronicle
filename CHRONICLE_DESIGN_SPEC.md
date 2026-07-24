# CHRONICLE — DESIGN & PRODUCT SPEC
*Written July 2026. Supersedes the UI sections of CHRONICLE_MASTER_HANDOFF.md.
The launch roadmap is paused: nothing ships until the UI is right.*

---

## 0. STATUS

- **Decision:** full UI overhaul before App Store submission. The launch
  roadmap's "ship now, iterate later" advice is explicitly overridden.
- **Privacy policy:** built and in the app (`privacy.tsx`) — resolved.
- **Designed:** all 8 day-card carousel slides mocked in Google Stitch.
- **Built:** nothing yet. Build phase has not started.
- **Next:** `theme.ts` design tokens → per-slide specs → one Fable run
  per slide with a commit between each.

---

## 1. THE CORE PROBLEM: WHY CHRONICLE LOOKED AI-MADE

Chronicle's previous UI was immediately recognisable as AI-generated. This
matters commercially: if the app looks like something anyone could
regenerate in an afternoon, it has no defensibility and no premium feel.

**Diagnosis.** AI-generated UI treats all content identically — every
section becomes a bordered card of the same size and radius, every label
becomes tracked all-caps, every icon becomes an emoji, the accent colour
appears on every border and pill. The result is uniform, templated, and
characterless.

**The counter-principle, discovered mid-session and now the governing
rule of the app:**

> **Every slide is a physical object.**

The slides that felt premium each had one dominant physical thing: a
globe, a polaroid, an album cover in a stereo, a newspaper page. The
slides that felt "boring" were pure typography with no object. This is
the difference between a designed app and a generated one.

Corollary: **de-AI never meant "make it plain."** Plainness produced the
worst slide of the session. It meant *stop using generic UI containers*.
A distinctive physical object is the opposite of a generic box.

Second corollary: **one dominant element per slide.** The slide that
failed repeatedly (people & places) had four competing elements — people,
places, map, stats. Slides with a single hero worked first time.

---

## 2. DESIGN SYSTEM

### The two worlds

| | Your Past | Your Present |
|---|---|---|
| Background | `#17102a` (purple-black) | `#0b1526` (blue-black) |
| Card surface | — | `#101c33` |
| Accent | `#9b72ff` | `#4a90d9` |
| Typeface | Fraunces (editorial serif) | Space Grotesk (geometric) |
| Mood | Retro, nostalgic, rewind | Modern, crisp, forward |

### Shared

- Capsule gold `#f5c842` — **Future Capsules only**, nowhere else, ever
- Text: white / `rgba(255,255,255,0.7)` / `rgba(255,255,255,0.4)`
- Hairline divider: `rgba(255,255,255,0.08)`
- Fraunces at small sizes: weight 400, never below 13pt, letterSpacing ≤ 0.5

### Layout rules

1. Structure comes from whitespace and hairlines, not bordered cards
2. Photos are full-bleed with text on gradient scrims, never boxed
3. Details are label-left / value-right rows, not tile grids
4. **Sentence case everywhere.** Never tracked all-caps in UI chrome
5. Accent colour appears 3–4 times per screen maximum
6. Thin-line vector icons. Emoji only as user content (mood), never as
   an icon system
7. Flat solid buttons. No gradients, glows, or decorative shadows
8. Every element type gets bespoke treatment — a mood, a map, a photo
   and a person should not look alike
9. Designs imply motion (progress rings, page dots, subtle depth)

### Diegetic exceptions (deliberate, documented)

Font and case rules apply to **UI chrome**. Printed objects may look like
themselves:

- **Polaroid captions** — handwriting, because *you* wrote on the photo
- **Newspaper masthead** — serif, because mastheads are serif
- **Passport page** — tracked caps, because passports are set that way

These are the only three. If the exception leaks into UI chrome, it
becomes a gimmick.

---

## 3. THE DAY CARD CAROUSEL

### The 8/8 ring vs the 8 slides — NOT the same eight

This was conflated early and must stay separated:

- **The ring counts inputs** — things the user fills in
- **The slides count displays** — ways a day is shown

The cover slide is generated, not filled in. Do not force a 1:1 mapping.

### Slide roster

| # | Slide | Object | Status |
|---|---|---|---|
| 1 | Cover | Globe | ✅ Approved |
| 2 | Today's capture | BeReal photo pair | ✅ Approved |
| 3 | Your camera roll | Polaroid + thumbnail strip | ✅ Structure approved |
| 4 | Three words + mood | Monumental typography | ✅ Approved |
| 5 | Your day (story) | Handwriting / journal | ✅ Approved |
| 6 | Sound & screen | Album art + ambient glow | ✅ Approved |
| 7 | Who and where | Map route | ✅ Structure approved |
| 8 | Beyond today | Newspaper page | ✅ Approved |

---

### SLIDE 1 — COVER

Establishing shot: where, when, who.

- Chevron-down dismiss left, share icon right
- "Thursday" secondary → **"23 July"** huge (Space Grotesk bold) → year muted
- Unboxed metadata row, dot separators: weather · mood · photo count
- **Globe**, circular, floating directly on background — no container.
  Blue atmosphere glow bleeding into the screen. Single glowing pin-dot
  with one soft pulse ring at the day's location. No flight arc.
- Row of circular people thumbnails + "Spent with Alex, Sam & Mum"
- 8 page dots, first active, "1 of 8"

**Weather-reactive atmosphere (approved concept).** The globe's glow
modulates by weather — *colour temperature only, never particles*:

- Hot / clear (25°+) → glow warms toward amber at the limb
- Cold (< 5°) → pale cyan-white, tighter and crisper
- Rain / storm → dimmed, desaturated, faint cloud swirl
- Snow → very pale, high diffusion
- Mild → default accent glow

**Critical:** the weather tint *blends with* the world accent, never
replaces it. A hot Past day is purple-leaning-warm; a hot Present day is
blue-leaning-warm. The world always wins, or the two worlds converge.

**Build note:** does not require a live 3D globe. Ship pre-rendered globe
imagery with the pin composited on top.

---

### SLIDE 2 — TODAY'S CAPTURE

- Top bar + centred subtitle "Today's capture"
- One large back-camera photo, full-bleed, generous rounded corners
- Selfie inset top-left, ~100pt tall, thin dark outline (BeReal pattern)
- One quiet line beneath: "Captured 18:04"
- No scrolling. Nothing else.

**Past variant:** the day's cover photo (settable via the ⋯ menu) fills
the same slot, no selfie inset. Same architecture, different source —
this keeps the Past from feeling structurally poorer than the Present.

---

### SLIDE 3 — YOUR CAMERA ROLL

- Top bar + centred subtitle "Your camera roll"
- **One polaroid**, centred, ~65% screen width, soft shadow
  - Warm aged-cream frame — never pure white
  - Thin on three sides, much thicker at the bottom
  - **Exactly one photograph inside.** Never a grid, collage, or screenshot
  - Bottom margin: time at left ("14:32"), handwritten caption beneath
- **Thumbnail strip** below: ~56pt squares, scrolls sideways, selected
  one has thin blue border, others dimmed, video marked with play glyph
- "12 photos · 2 videos" muted beneath
- Fits one viewport, no scrolling

**Why one-at-a-time, not a grid:** tapping a thumbnail changes the
featured photo, so no horizontal swipe is consumed inside the slide.
Horizontal stays purely for moving between slides. This solves the
original complaint (10+ swipes to get through a day) and the gesture
conflict simultaneously.

**Open decision:** polaroid rotation — subtle 1–2° tilt (warmer, physical)
vs perfectly straight (cleaner, more premium). One value in code.

**Video handling:** plays inline in the polaroid frame, muted and looping,
tap to unmute — or a still with a play glyph. Same frame either way.

---

### SLIDE 4 — THREE WORDS + MOOD

- Three words stacked vertically, **monumental** scale, Space Grotesk bold
- Two have short faint underlines (40% of word width, 40% opacity accent)
  indicating a hidden explanation; the third has none — **optionality must
  be visible**, or filling a day becomes homework
- Mood emoji beneath, large, no container. **A face, not weather** —
  weather already appears on slide 1
- Tap a word → it stays in place, a short explanation appears beneath in
  Space Grotesk white 70%, and the other two words dim to 40%

This is the "quote page" of the day and a likely screenshot moment.

---

### SLIDE 5 — YOUR DAY (STORY)

- Muted question: "What did today look like?"
- Body text, white 85%, comfortable line height, reading like real writing
- **Names auto-link.** No `@` syntax — Chronicle already knows your people,
  so known names render as tappable accent-coloured links automatically.
  `@` is Slack-brain and would puncture the cozy feeling.
- **New name detected** → soft prompt beneath: "Alex isn't in your people
  yet. Add them?" One tap. This grows the people graph passively.
- Voice memo, if recorded, renders as a **waveform player** instead of
  text — a spoken day should *look* different from a written one
- Hairline → Highlight / Lowlight, short label-value rows
- Hairline → "Something I learned" + thin-line lightbulb icon.
  Feeds the future "bank of things learned"

**Input order matters:** capture *who I was with* BEFORE the story in the
input flow, but display the story BEFORE people in the card. Then the app
already knows who to link by the time you write.

**Code notes:** the learned-fact must not be typographically larger than
the story itself (hierarchy inverted in the mock). Accent budget was
exceeded — waveform to grey, timestamp to muted.

---

### SLIDE 6 — SOUND & SCREEN

**The ambient concept:** extract dominant colours from the artwork and let
them light the whole screen — a soft gradient bleeding from behind the
artwork, fading to background at the edges. **Every song produces a
different slide.** This beats a fixed scene, which goes stale by the third
viewing.

- Large square album artwork, ~65% width, rounded, soft coloured glow
- Title (white) / artist (muted)
- Progress line + thin-line transport controls (previous, play, next)
- **Rating:** ten small boxes numbered 1–10. Filled boxes up to the
  rating, selected box solid white with dark numeral, remainder dim
  outlines. "7/10" beside. Label beneath: "How it hit".
  **Never stars** — star rows are the most generic UI element there is.
- Reaction line, white 75%, in quotation marks
- Store label: "Apple Music"
- **Bottom row:** the *other* item as a small dimmed thumbnail with a
  thin-line swap icon. Tapping swaps them — the film becomes the
  centrepiece and the song shrinks to the bottom. **The content is the
  control** — no segmented pills or tabs.

**Film panel must NOT inherit music components.** No progress line, no
transport controls, store label reads "Apple TV". Symmetrical in layout,
not identical in components.

**Build:** `react-native-image-colors` for palette extraction,
`expo-linear-gradient` (already installed) for the glow.

---

### SLIDE 7 — WHO AND WHERE

**Three failed approaches, documented so they aren't retried:**
passport page (dark), passport page (cream paper), notebook page. All
failed because (a) paper objects need texture that renders badly, and
(b) the slide had four competing elements instead of one hero.

**Approved: the map is the object.** The information *is* the object,
rather than a decorative container holding a list.

- Dark map, fine pale-blue line work on near-black, full-bleed, filling
  ~3/4 of the screen. No photographic imagery. Sparse small labels.
- Three stops as glowing dots with soft pulse rings, in visit order
- Thin dashed accent line connecting them, gently curving
- Each stop labelled: "Rocca · 13:30" + thin-line place-type glyph
- **People placed on the map at the stop where you were with them** —
  circular portraits ~44pt, thin white ring, soft shadow, clustering with
  "+2" where several overlap
- Soft gradient fading the map's bottom edge into the background
- Below: three figures, unboxed — "8,432 steps · 6.2 km moved · 3 places"
  + "From Apple Health"
- Below that: scrollable row of people portraits (~52pt) with names,
  sixth cut off at the edge, ending "+3". Heading: "Who you were with"

**Must fix in build:** map zoomed out enough that all stops and all
labels sit fully on screen with margin.

---

### SLIDE 8 — BEYOND TODAY

**The newspaper page.** This slide was the proof of the physical-object
thesis: identical content went from the worst slide of the session to one
of the best purely by becoming an object.

- **Masthead:** thick rule → "Chronicle" in large serif → thin rule →
  "Thursday 23 July 2026" left, "The day in the world" right
- **Lead story:** wide dark photo, serif headline, "BBC · 14:02", then the
  user's reaction as a pull quote — italic serif, thin accent rule at left
- Thin rule → **"From the archive"**: two historical entries in two narrow
  columns separated by a vertical rule, small print, year in bold
- Thick rule → **the reflection**, deliberately different: a handwritten
  note *resting on* the newspaper — lighter warm surface, ~2° rotation,
  soft shadow, **no border, no card outline**. Label "For future you",
  the question, the answer.

**The input mechanic:** the user saves a headline that meant something and
writes a reaction. Per the master document — *a reaction is itself a
record*. This is what makes the slide a real slide rather than a read-only
dead end.

**Sources:** GDELT headlines + Wikipedia on-this-day + football scores
(all existing). **Apple News has no public API** — not available.

**Cut deliberately:** "one year ago in Chronicle" links. They duplicate
Your Past, and a slide that points elsewhere isn't a slide.

**Reflection data already exists** as `reflectionQuestion` /
`reflectionAnswer` in DayEntry — captured today with nowhere to display.

---

## 4. RUNNING CODE-NOTES LIST

Fixes identified in mocks that are single-property changes — do NOT
re-iterate these in Stitch, apply them at build:

- Sentence case everywhere: "Today's capture", "Your camera roll",
  "6 of 8", "Apple Music", "Steps", "Km moved", "Who and where"
- Header: date reads "Thursday 23 July"; dismiss is chevron-down; heading
  is a centred subtitle directly beneath the date (slide 2's treatment is
  the pattern for all eight)
- Slide 4: words at the larger monumental size from the first pass
- Slide 5: learned-fact smaller than the story; waveform and timestamp
  to grey
- Slide 6: film panel has no transport/progress; "Apple TV"; per-item
  reaction; swap row fully on-screen above the page dots; page dots
  pinned to the bottom edge on both panels
- Slide 7: map zoomed out, all labels on-screen; stats below the map, not
  overlapping
- Slide 8: reflection note has no border/card — rotated paper with shadow
- Portrait circles in mocks contain baked-in text (Stitch artefacts) —
  real photos in build

---

## 5. PLATFORM & API DECISIONS

### iTunes Search API — approved for MVP
Free, no key, no OAuth. Covers music, podcasts, films and TV. Returns
artwork, metadata, and 30-second preview URLs.

**Terms constraint:** artwork and previews may be used only to promote
store content, and must appear near a store badge. Compliance approach:
artwork taps through to the store, small badge displayed. (Alternative if
preferred: text-only use — correct title/artist/year — with no artwork,
which avoids the constraint entirely.)

**Input pattern:** search-as-you-type with results, plus a "just type it"
fallback for anything not in the catalogue (YouTube video, a gig, a play).
Manually typed items render without artwork — acceptable.

**Privacy policy needs a line added:** anonymous title queries to Apple.

### HealthKit — approved, Phase 2
Read-only, **steps and distance only** (not workouts or heart rate — those
don't describe a *day*). Data never leaves the device, so the privacy
promise holds.

- Requires a native module and a **development build** — will not work in
  Expo Go. Available around the time the UI work completes.
- Needs HealthKit entitlement, usage-description string, review notes
- **Design now, build later:** the stat row renders whatever exists. No
  permission → the steps figure simply isn't there. Same `undefined`
  guarding already applied to every DayEntry field.

### Mapbox — required, currently blocking slide 7
Apple Maps **cannot be styled at all**. The dark cartographic map and the
parchment Past map both require `@rnmapbox/maps`.

- Render as a **static snapshot**, not a live interactive map — solves
  performance, and the image can be cached per day
- Offline fallback: cached image, else the place list alone
- Two authored styles in Mapbox Studio:
  - **Present** — dark cartographic, glowing blue line work
  - **Past** — parchment/sepia with purple-tinted ink, hand-drawn feel

The parchment map is a *better* fit for the Past than the Present: an
aged, hand-inked map is literally a map of somewhere you can't return to.
This gives the Past its own visual reason to exist rather than being a
recolour.

### Android — V2, not now
Expo makes it cheaper than a rewrite, but: HealthKit is iOS-only (Health
Connect is a separate integration), the custom tab bar and permission
flows need retesting, and the visual language is iOS-flavoured. One
platform done beautifully beats two done adequately — especially with a
UK student audience that skews iPhone.

---

## 6. PAST VARIANTS

Build as a **recolour + font swap** of the shared component, not separate
Stitch designs. `accent` and font are already parameterised.

**Caveat to watch:** a straight recolour gives a *tinted Present*, not a
genuinely nostalgic Past. Fraunces is doing heavy lifting — a serif at
display size changes the whole character. Build it, screenshot it, and
only design Past-specific treatments if it reads flat. Don't pre-solve.

Slide-specific Past differences:
- Slide 2: cover photo, no selfie inset
- Slide 7: parchment map style
- Slide 8: same newspaper, purple ink

---

## 7. NAVIGATION IDEAS (POST-RESTYLE)

### Swipe between worlds
Horizontal swipe on the main Past/Present screens to move between them —
"your book, your story". Achievable with `react-native-gesture-handler` +
`reanimated` (both already in Expo).

- **Recommended:** slide-with-depth — departing screen scales to ~0.96 and
  dims as the next comes in. Cinematic without the complexity.
- **Avoid:** true page-curl libraries — finicky, poorly maintained, and
  they conflict with Expo's managed workflow.
- **Risk:** the custom tab bar was a major debugging cost. Any navigation
  change is high-stakes. **Do this after the visual restyle lands.**

### The "You" tab — approved in principle
Third tab: **Your Past · You · Your Present.** You standing between what
was and what is. Pairs naturally with the swipe navigation.

**Rationale:** People and Places living inside Your Past is arbitrary —
Alex isn't a past thing, and neither is your flat. Anything about *you*
rather than about a moment has no correct home today: library, favourites,
reminders, learned-facts bank, selfie timeline.

**Constraint:** it must hold things that already exist elsewhere. The
moment it grows its own separate content, it competes with the core.

**Build as a plain screen now.** The apartment-building concept (below) is
a *skin* applied to the same structure later.

---

## 8. ROADMAP — CAPTURED, NOT BUILDING NOW

### 1.1 flagship: tagging → dashboard → reminders → events
The biggest product idea since the time loop itself. Turns Chronicle from
retrospective into a planning tool that *feeds* the memory record.

- Create a reminder on a dashboard: dinner at a tagged restaurant, with
  tagged people, next week
- Reminded the day before and on the day
- On the day, it **auto-becomes an event in that day's entry** — you then
  say how it went and who was there
- Events can also be added retrospectively
- Produces an **Events vault** alongside the Days vault: look back at a
  date and find both saved days and saved events

**Where it lands visually:** an event is people + place + time, which is
exactly slide 7. It becomes a third block there — no ninth slot needed.
Slide 7 should be designed with room to absorb it.

**Scope:** new data model, notification scheduling, a new dashboard
screen. Weeks, not days. Do not let designing the You tab pull it forward.

### 1.1 premium: the Chronicle character builder
Illustrated preset parts (hair, skin tone, accessories) assembled
manually, Mii-style, for people profiles. Small illustrated house /
restaurant / landmark icons for places.

**Explicitly NOT AI-generated from photos.** Sending friends' photos to an
AI API breaks the "no data leaves the device" promise — which is the App
Store privacy answer, the Snapchat marketing wedge, and the brand.
On-device assembly only.

Good premium feature: emotionally sticky, shareable, zero impact on the
free core.

### 1.1+: the apartment "You" screen
Your character in a high-rise apartment, light by day and dark by night,
different rooms holding different things — selfie booth, lists, library,
people, places.

**Depends on the character builder** — an empty apartment is pointless.
Ships as a skin over the plain You tab. Charming and screenshot-friendly,
but it is a lot: illustrated rooms, day/night states, and a navigation
paradigm inside a screen.

### 1.2: the sparse-past problem + review loops

**The problem, precisely stated:** eight slides designed for a rich day
become eight empty states for a day in 2016 with two screenshots. A day
card that's 80% blank is worse than no day card.

**The solution is density-adaptive, NOT abandoning days.** Some old days
*are* rich — birthdays, holidays, moving day. "This exact day, five years
ago" is the hook and the marketing line.

| Density | Treatment |
|---|---|
| Rich (photos, captions, context) | Full 8-slide day card |
| Thin (a screenshot or two) | Single quiet card, not eight slides |
| Empty | Absorbed into its week or month; no day card |

Month view becomes the **default entry point the further back you go**.
2016 opens as "July 2016"; last month still opens as individual days.

**Eras.** Label a period — "exams", "first flat", "the Greece summer".
This is how memory actually works: nobody remembers 14 July 2016, everyone
remembers the summer they finished school. This is the Life Timeline
concept from the master document finally having a home.

**Review loops.**
- **Comparative:** on a Monday, surface recent Mondays — how did this one
  compare?
- **Sunday weekly catch-up:** review the week, write a summary
- **Monthly catch-up:** review the month

**The key insight connecting them:** weekly and monthly reviews are how
you *prevent* a sparse past going forward. A week you barely documented
still gets a summary written at the time — so in five years that week
isn't empty, it has a paragraph you wrote while you still remembered. The
review loop is the fix for the sparse-past problem, applied forwards.

### Trips (the passport, reclaimed)
The passport metaphor was cut from daily use because a passport is about
*travel* — using it for an ordinary Tuesday devalues it, which is exactly
why those mocks felt bland.

**Saved for trips.** Opening a saved trip gives you a passport page:
stamps for everyone who came, entries for every place, the route, the
figures. It becomes a genuine reward and gives the Life Timeline /
big-moments concept a real visual identity.

Full spec already written (dark and cream variants) — see session history.

---

## 9. BUILD METHODOLOGY

### Why the last restyle failed
A whole-app sweep, executed from a vibe rather than a spec, with no
preview. Result: `git reset --hard` and a lost day.

### The pipeline
1. **`constants/theme.ts` first.** Every colour, font size, weight, and
   spacing value in one file. Slides reference `theme.text.body`, never
   hardcoded numbers. Highest-value single action: makes the app
   consistent by construction, and a global change becomes one line.
2. **Specs, not vibes.** Each slide written as exact values measured off
   the approved mock — "date: Space Grotesk 600, 15pt,
   rgba(255,255,255,0.5), marginBottom 2". **Fable cannot see the mocks.**
   Pasting a screenshot and saying "make it look like this" produces an
   interpretation — which is exactly how the last restyle died.
3. **One slide per Fable run. Commit between each.** Never a sweep. A bad
   round costs twenty minutes, not the app.
4. **Screenshot comparison as the acceptance test.** Mock and build side
   by side; differences become a short numbered correction list.

### Expectation
It will **not** be pixel-identical, and shouldn't be. Stitch renders web
type at arbitrary sizes with stock photos; the real thing has real photos,
iOS font rendering, and a real safe area. What transfers is **hierarchy,
spacing rhythm, and restraint** — that's what reads as premium.

### The Stitch rule (learned the hard way)
**Two rounds per screen, maximum.** Stitch has no persistent model of a
screen — each iteration regenerates from scratch, so corrections compete
and previously-correct elements fall out. Observed degradation: identical
images returned on slides 7 and 8; slide 7 eventually labelled every
person "Km moved". First prompt for structure, one refinement, then move
on. Everything else goes on the code-notes list.

Stitch is for **visuals only** — its exported code is web-flavoured and is
never used.

### Sequencing
Design all eight slides → build `theme.ts` → implement slides in order.
Designing everything first means the tokens are derived from the complete
picture rather than guessed from slide one.

---

## 10. OPEN DECISIONS

1. **Polaroid rotation** — subtle tilt or perfectly straight
2. **iTunes artwork** — display with store badge, or text-only to avoid
   the terms constraint entirely
3. **Logo recolour** — the current icon's royal blue may only need a nudge
   toward `#4a90d9`, not a full swap. Note: app icons must be brighter and
   more saturated than in-app backgrounds — an icon in `#0b1526` would
   vanish on a home screen. Do this separately from Stitch, at App Store
   prep.
4. **Input screens** — the Today tab and the 8/8 ring flow are not yet
   designed. They should follow the same physical-object language.

---

*Chronicle — Design & Product Spec — July 2026*
