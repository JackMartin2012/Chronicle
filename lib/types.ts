// Chronicle — day record types.
//
// One group per editor, eight in all, so the record maps 1:1 onto the Today
// screen's tiles and the progress ring. Shapes for sound / people / places /
// future note come from 08_EDITOR_BUILD_SPECS.md and match what the editors
// already hold in local state.
//
// EVERY field is guarded when reading (see normaliseDayEntry in dayEntry.ts).
// Records already on the phone predate all of this and will be missing most of
// it, so nothing here may be assumed present.

// ---------------------------------------------------------------------------
// 1 — CAPTURE
// ---------------------------------------------------------------------------

export type Capture = {
  mainPhotoUri: string;
  selfieUri: string;
  /** Which of the pair fills the big frame. false = the main photo. */
  selfieIsBig: boolean;
  /**
   * ms since epoch, stamped when a new capture is saved. Undefined on every
   * capture made before this field existed — deliberately NOT backfilled, so
   * old captures show no "Captured HH:MM" line.
   */
  capturedAt?: number;
};

// ---------------------------------------------------------------------------
// 2 — THREE WORDS
// ---------------------------------------------------------------------------

/** The word is complete on its own; the reason is a skippable bonus. */
export type ThreeWord = {
  word: string;
  why: string;
};

export type ThreeWordsBlock = {
  /** 0-3 entries. Never assume three. */
  words: ThreeWord[];
  /** Emoji, chosen from the suggestions the typed words produced. */
  mood: string;
};

// ---------------------------------------------------------------------------
// 3 — STORY
// ---------------------------------------------------------------------------

/**
 * Text and voice COEXIST — a locked design decision. The notebook page is
 * always writable and the recording is an optional companion, never a
 * replacement, so both fields can be set at once and neither clears the other.
 */
export type Story = {
  text: string;
  voiceNoteUri: string;
  /** Milliseconds; 0 when there's no recording. */
  voiceNoteDuration: number;
};

// ---------------------------------------------------------------------------
// 4 — SOUND
// ---------------------------------------------------------------------------

export type SoundMode = 'listen' | 'watch';
export type MediaType = 'song' | 'podcast' | 'film' | 'tv';

export type SoundEntry = {
  mode: SoundMode;
  mediaType: MediaType;
  title: string;
  /** Artist, or release year for a film. */
  subtitle: string;
  artworkUrl: string;
  /** 1-10; 0 means unrated. */
  rating: number;
  note: string;
  /** iTunes trackId/collectionId. */
  externalId: string;
};

/** Two independent slots — picking a song must not clear a chosen film. */
export type SoundSlots = {
  listen: SoundEntry | null;
  watch: SoundEntry | null;
};

// ---------------------------------------------------------------------------
// 5 — PEOPLE
// ---------------------------------------------------------------------------

/** A real record, not a loose string — the photo comes later, from the profile. */
export type Person = {
  id: string;
  name: string;
  photoUri?: string;
};

// ---------------------------------------------------------------------------
// 6 — PLACES
// ---------------------------------------------------------------------------

export type PlaceCategory =
  | 'home'
  | 'someones'
  | 'work'
  | 'food'
  | 'outdoors'
  | 'sport'
  | 'travel'
  | 'other';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  /** Separate from category: a place can be any kind AND matter to you. */
  meaningful: boolean;
  /**
   * Set when this was folded into a place you already had. The tag is kept —
   * the day still records you were there — but it doesn't show as its own pill.
   */
  mergedIntoId?: string;
};

// ---------------------------------------------------------------------------
// 7 — LEARNED
// ---------------------------------------------------------------------------
// Plain string on the record; see DayEntry below.

// ---------------------------------------------------------------------------
// 8 — FOR FUTURE YOU
// ---------------------------------------------------------------------------

/** When the note comes back. 'random' is resolved to a real date on write. */
export type SurfaceWhen = 'month' | 'year' | 'random' | 'date';

export type FutureNote = {
  note: string;
  when: SurfaceWhen;
  /** Concrete date key the note surfaces on, even when `when` is 'random'. */
  surfaceKey: string;
  isQuestion: boolean;
  /** What you wrote back to a note that surfaced today. */
  reply: string;
};

// ---------------------------------------------------------------------------
// THE DAY
// ---------------------------------------------------------------------------

export type DayEntry = {
  /** 'YYYY-MM-DD', always built in LOCAL time. */
  dateKey: string;

  capture: Capture;
  threeWords: ThreeWordsBlock;
  story: Story;
  sound: SoundSlots;
  people: Person[];
  places: Place[];
  learned: string;
  futureNote: FutureNote;
};

/**
 * A partial update. Object groups MERGE with what's stored, so saving
 * `{ capture: { selfieUri } }` leaves `mainPhotoUri` alone. Arrays and plain
 * strings REPLACE wholesale — a people list is only ever meaningful entire.
 */
export type DayEntryPatch = Partial<{
  capture: Partial<Capture>;
  threeWords: Partial<ThreeWordsBlock>;
  story: Partial<Story>;
  sound: Partial<SoundSlots>;
  people: Person[];
  places: Place[];
  learned: string;
  futureNote: Partial<FutureNote>;
}>;
