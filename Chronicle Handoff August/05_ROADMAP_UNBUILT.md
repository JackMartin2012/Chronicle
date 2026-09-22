# CHRONICLE — ROADMAP: DISCUSSED BUT NOT BUILT

Everything below is captured so it isn't lost. None of it is built. Rough order of
when it should happen is noted, but the immediate job is finishing the editors and
wiring (see 02 & 04).

---

## THE NOTE-VAULT LOOP (new this session — a strong mechanic)
The light "For future you" note becomes a two-way, time-looped conversation with
yourself. Distinct from Future Capsules (below).

**The loop:**
1. Today you leave a note/question for future you, tagged to a future day
   (via the For-future-you editor's "when" picker).
2. That day arrives → your DASHBOARD shows a prompt: "You have a note waiting —
   save today's entry to open it."
3. You fill in your day → the note SURFACES inside the day editor, and you can
   RESPOND to it (answer the question, react to the reminder). Responding is
   optional but makes it interactive.
4. The note + your response are both preserved in a NOTE VAULT in your dashboard,
   browsable forever.

**The clever pairing:** a surfaced note-question can become today's "something you
learned" — past-you asks "find out why X"; today you learn it and answer; it banks
in BOTH the note vault and the things-learned bank. The two editors feed each other.

**Needs:** the dashboard (doesn't exist), a note data model, notification
scheduling, surfacing logic in the day editor. Roadmap alongside dashboard/events.

---

## FUTURE CAPSULES (distinct from For-future-you)
The RICH, ceremonial version. You seal a photo / video / voice memo / journal (or
all at once) for a chosen future date. You get notified in your dashboard, go to a
CAPSULE ROOM where you create capsules and see "open a capsule" when one's ready,
and opened capsules rest in a CAPSULE VAULT you can keep them in. Capsule gold
`#f5c842` is reserved exclusively for this feature. A whole feature space — big.

**Distinction from For-future-you:** capsules = rich media + ceremony + own room/
vault. For-future-you = a quick text note/question that surfaces inline in a day.

---

## THE DASHBOARD (doesn't exist yet — central to several features)
A hub that would hold: the note-vault prompt ("you have a note waiting"), the
capsule-ready prompt, the note vault, the things-learned bank, reminders/to-dos,
and be the home for the events system. Several deferred features assume it exists.
Likely lives in or alongside the "You" tab.

---

## THE "YOU" THIRD TAB (approved in principle; contents REVISED Sept 2026)
Restructure navigation to: **Your Past · You · Your Present** — you standing
between what was and what is. Pairs naturally with the swipe-between-worlds idea.

**DECISION (Sept 2026): People and Places MOVE to the You tab. They do not stay
in Your Past.**

**The You tab's contents:**
- **People**
- **Places**
- **Favourites**
- **Daily Selfie**
- **Stories** (new — see the STORIES section below)

**Rationale for moving People and Places:** a person or a place isn't tied to a
time period, so it doesn't belong exclusively to Past or Present. Alex isn't a past
thing, nor is your flat. Putting them in You keeps **Past and Present simple and
repeatable — a stream of days** — while **You collects everything that's about the
person rather than the moment.** The same test decides anything else that's
proposed for this tab: is it about a moment, or about you?

Other things about YOU rather than a moment that also have no home today: library,
reminders, things-learned bank, the note vault, and (via the dashboard) the
note-vault and capsule prompts.

**Caution, now with an exception:** the original rule was that the You tab only
collects things that ALREADY exist elsewhere — "the moment it grows its own
separate content it competes with the core." Stories is deliberately NEW content,
so it breaks that rule. That needs an explicit answer in Stories' design pass (see
below) rather than being waved through.

**Build as a plain screen first.** The apartment concept (below) is a skin applied
to the same structure later.

**Migration note:** People and Places currently live in `app/(tabs)/index.tsx`
(Your Past). Moving them is a real change to that file and to the tab structure
(`app/(tabs)/_layout.tsx` has two tabs today), not just a doc edit — plan it as its
own piece of work.

---

## THE APARTMENT "YOU" SCREEN (1.1+, depends on Mii builder)
Your character in a high-rise apartment, light by day / dark by night, different
rooms holding different things (selfie booth, lists, library, people, places).
Charming and screenshot-friendly but a lot: illustrated rooms, day/night states, a
navigation paradigm inside a screen. Its centrepiece is the character (below), so
it ships WITH the Mii builder or not at all — an empty apartment is pointless.

---

## THE MII / CHRONICLE CHARACTER BUILDER (premium, 1.1+)
Illustrated preset parts (hair, skin tone, accessories) assembled MANUALLY,
Mii-style, for people profiles. Small illustrated house/restaurant/landmark icons
for places. **Explicitly NOT AI-generated from photos** — sending friends' photos
to an AI API would break the "no data leaves the device" promise, which is the App
Store privacy answer, the Snapchat marketing wedge, and the brand. On-device
assembly only. Good premium feature: sticky, shareable, zero impact on the free core.

---

## TAGGING → DASHBOARD → REMINDERS → EVENTS (1.1 flagship)
The biggest product idea since the time loop. Turns Chronicle from retrospective
into a planning tool that FEEDS the memory record.
- Create a reminder on the dashboard: dinner at a tagged restaurant, with tagged
  people, next week.
- Reminded the day before and on the day.
- On the day, it AUTO-BECOMES an event in that day's entry — you then say how it
  went and who was there.
- Events can also be added retrospectively.
- Produces an EVENTS VAULT alongside the Days vault: look back at a date and find
  both saved days and saved events.

**Where it lands visually:** an event is people + place + time = exactly slide 7's
territory. It becomes a third block there — no ninth slot needed. Slide 7 should be
designed with room to absorb it.

**Scope:** new data model, notification scheduling, a new dashboard screen. Weeks,
not days. Don't let designing the You tab pull it forward.

---

## THE SPARSE-PAST PROBLEM + ERAS + REVIEW LOOPS (1.2)
**The problem:** eight slides designed for a rich day become eight EMPTY states for
a day in 2016 with two screenshots. A day card 80% blank is worse than none.

**The fix is density-adaptive, NOT abandoning days.** Some old days ARE rich
(birthdays, holidays, moving day). "This exact day, five years ago" is the hook and
marketing line.
- Rich day → full 8-slide card.
- Thin day (a screenshot or two) → a single quiet card, not eight slides.
- Empty day → absorbed into its week/month; no day card.
Month view becomes the DEFAULT entry point the further back you go (2016 opens as
"July 2016"; last month still opens as individual days).

**Eras:** label a period — "exams", "first flat", "the Greece summer". Nobody
remembers 14 July 2016; everyone remembers the summer they finished school. Also
supports the "profile" idea: "I was X year at school, X years old, living with
XYZ" attached to a period so thin days inherit context for free. This is the Life
Timeline concept finally having a home.

**Review loops (retention + prevents future sparse past):**
- Comparative: on a Monday, surface recent Mondays — how did this one compare?
- Sunday weekly catch-up: review the week, write a summary.
- Monthly catch-up.
Key insight: weekly/monthly reviews are how you PREVENT a sparse past going
forward — a barely-documented week still gets a summary written at the time, so in
five years it isn't empty. The review loop is the sparse-past fix applied forwards.

**Added Sept 2026:** the fix for days that ALREADY happened — and can't be
reviewed at the time — is **Stories** (below): a written memory as content, where
Eras supply only context.

---

## STORIES (new idea, Sept 2026) — the sparse-past fix, concretely

**The problem (documented above):** old days have no present-style data. There's no
song logged, no real-time capture, no three words — because those things didn't
exist yet when the day happened. Eight slides built for a rich day become eight
empty states.

**The fix:** a dedicated **Stories** feature where the user writes down a memory
they still hold about a past day — an **anecdote, not a live log.** It is content
the user CAN still supply for an old day, unlike a song or a live photo. Nobody
remembers what they listened to on 14 July 2016, but they may well remember the
story of that afternoon.

**Stories vs Eras — they complement each other, they don't compete:**
- **Eras give old days CONTEXT** — a period label, a stage of life ("first flat",
  "the Greece summer"). Thin days inherit it for free.
- **Stories give them CONTENT** — an actual written memory attached to the day.
Context frames an empty day; a story fills it. A day can have both.

**Where it lives:** the **You tab** (alongside People, Places, Favourites, Daily
Selfie).

**Status: NOT speced, NOT built.** This is a roadmap addition and needs its own
design pass before any building. Open questions for that pass:
- How a story attaches to a date (or a range of dates), and how it appears on that
  day's card and in the month view.
- Whether it's written in the Story editor's ruled-notebook style or is its own
  object (the "one dominant physical object" rule applies).
- How it squares with the You-tab rule that the tab only collects existing things
  (Stories is new content — see the caution above).
- How it relates to the density-adaptive day card (a thin day with a story is no
  longer thin).

---

## TRIPS (reclaims the passport metaphor)
The passport was cut from daily use (a passport is about travel; using it for an
ordinary Tuesday devalued it — which is why those mocks felt bland). SAVED FOR
TRIPS: opening a saved trip gives a passport page — stamps for everyone who came,
entries for every place, the route, the figures. A genuine reward, and gives the
Life Timeline / big-moments concept a real visual identity. (Full dark + cream
passport specs were designed earlier in the session.)

---

## NAVIGATION: SWIPE BETWEEN WORLDS (post-restyle)
Horizontal swipe on the main Past/Present screens to move between them — "your
book, your story". Achievable with gesture-handler + reanimated (both in Expo).
Recommended: slide-with-depth (departing screen scales ~0.96 and dims). AVOID true
page-curl libraries (finicky, conflict with Expo managed workflow). RISK: the
custom tab bar was a major debugging cost — any navigation change is high-stakes.
Do it AFTER the visual restyle lands. Pairs with the You-tab structure (swipe
left→past, right→present, You in the middle).

---

## PAST-WORLD VARIANTS OF EVERY SLIDE
Build as a recolour + font swap of the shared components (`accent` and font are
parameterised). CAVEAT: a straight recolour gives a TINTED present, not a
nostalgic past — Fraunces at display size changes the whole character; build it,
screenshot it, only design past-specific treatments if it reads flat. Slide-
specific past differences: slide 2 = cover photo, no selfie inset; slide 7 =
parchment map style; slide 8 = same newspaper, purple ink. Resolve the Fraunces
min-size token conflict here (override caption/micro to 13pt).

---

## MONETISATION & ADS (decided)
- **No ads, ever.** Core brand value; the App Store privacy answer is "Data Not
  Collected"; the Snapchat marketing wedge is being private. A banner ad would
  break all three (ad SDKs collect data; cheapen the premium feel; earn pennies at
  this scale). Explicitly rejected this session.
- Model is **Chronicle Plus** (£3.99/mo · £29.99/yr): news feed, unlimited albums,
  capsules, recaps, character builder, etc. Free tier is genuinely good; money
  comes from converting to Plus, not advertising. Deferred to v1.1.
- v1.2: December "Your Year, Chronicled" recap (Spotify-Wrapped equivalent).

---

## ALL DATA WIRING (the invisible half — deferred)
Everything built is presentation-only on sample data. Nothing saves, loads, or
touches the camera/photos. The Today screen and editors need connecting to real
`DayEntry` storage; editors need to write; tiles need to reflect saved state;
photo GPS needs reading; iTunes/GDELT/etc. need fetching with crash-proofing.
This is substantial, unglamorous, and necessary — probably the single biggest
remaining chunk after the editors are designed.

---

## UPDATES (August 2026)

### Monetisation sequencing (refined)
- **Launch FREE.** No paywall at v1.0 — the free tier has to be genuinely good.
- **Chronicle Plus arrives in v1.1**, implemented via **RevenueCat** (handles
  subscription plumbing, receipts and restore-purchases so it doesn't have to be
  built by hand).
- **v1.2: the Wrapped-style recap** ("Your Year, Chronicled") — identified as the
  single highest-leverage marketing moment in the roadmap, because it's the one
  feature people screenshot and share unprompted.
- No ads, ever. Unchanged and non-negotiable.

### The note-vault loop — design now exists for the input half
The For-Future-You editor is BUILT, including the surfaced-note card with the
reply field and the "when should this come back?" picker. What's still missing is
everything downstream: the data model, notification scheduling, the surfacing
logic that decides a note is due today, and the vault itself (which needs the
dashboard, which doesn't exist).

The `isQuestion` toggle in the built editor already stores the flag that the
"answer it later in the Learned editor" pairing will read. Nothing consumes it
yet — that was deliberate, so the editor doesn't need redesigning when the loop
lands.

### Geo API decision — still open, now blocking two things
Google Places vs Mapbox for real place search. It blocks:
1. Slide 7 (the map route slide), and
2. Real search in the Places editor (currently a local sample list).

Mapbox is already installed and configured, which argues for consolidating on it.
Google Places has better name coverage for small venues. This needs deciding
before either can be finished.

### The wiring pass — scope reminder
Now that six editors exist, the wiring job is concrete: Today tile tap → open the
right editor → editor writes to real `DayEntry` storage → tile re-renders with
saved content → progress ring counts live filled inputs. Plus photo GPS reading,
iTunes fetching with crash-proofing, and the two slides that need updating
(Sound → Listen/Watch model; Story → serif body).

This remains the single biggest remaining chunk and the least glamorous.
