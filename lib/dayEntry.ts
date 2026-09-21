import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DayEntry,
  DayEntryPatch,
  Person,
  Place,
  SoundEntry,
  SoundSlots,
  ThreeWord,
} from './types';

// ---------------------------------------------------------------------------
// DATE KEYS
// ---------------------------------------------------------------------------

/**
 * Local-time date key. NEVER `toISOString().split('T')[0]` — that converts to
 * UTC first, so anyone far enough east or west gets the wrong day near
 * midnight, and their entry lands on the day before or after.
 */
export const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parse a date key back to a Date at MIDDAY. Midnight can roll into the
 * adjacent day across a DST shift; a midday anchor never does.
 */
export const parseDateKey = (dateKey: string) => new Date(`${dateKey}T12:00:00`);

export const todayKey = () => formatDateKey(new Date());

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
// Records use the EXISTING `day_entry_${dateKey}` key, so the rebuilt UI reads
// days already on the phone.
//
// The new shape is nested under one field rather than spread across the top
// level, because two field names COLLIDE with the legacy record:
//   legacy `threeWords` is string[]        — new is { words, mood }
//   legacy `sound` fields are songName/... — new is { listen, watch }
// Writing the new shapes at the top level would leave the old screens reading
// an object where they expect an array. Nesting keeps both intact: legacy
// fields are untouched, and a legacy-only record still reads correctly via the
// fallback mapping in normaliseDayEntry.

const storageKey = (dateKey: string) => `day_entry_${dateKey}`;

/** The field inside the stored record that holds the new shape. */
const NEW_SHAPE_FIELD = 'chronicle';

export const emptyDayEntry = (dateKey: string): DayEntry => ({
  dateKey,
  capture: { mainPhotoUri: '', selfieUri: '', selfieIsBig: false },
  threeWords: { words: [], mood: '' },
  story: { text: '', voiceNoteUri: '', voiceNoteDuration: 0 },
  sound: { listen: null, watch: null },
  people: [],
  places: [],
  learned: '',
  futureNote: { note: '', when: 'year', surfaceKey: '', isQuestion: false, reply: '' },
});

// ---------------------------------------------------------------------------
// READING — forgiving, because old records predate all of this
// ---------------------------------------------------------------------------

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const bool = (v: unknown) => v === true;

/** Legacy `threeWords: string[]` → the word+why shape. */
const readWords = (raw: unknown, legacy: unknown): ThreeWord[] => {
  if (Array.isArray(raw)) {
    return raw
      .filter((e): e is ThreeWord => !!e && typeof e === 'object' && typeof (e as ThreeWord).word === 'string')
      .map((e) => ({ word: e.word, why: str(e.why) }));
  }
  if (Array.isArray(legacy)) {
    return legacy
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((word) => ({ word, why: '' }));
  }
  return [];
};

/** Legacy `taggedPeople: string[]` (names only) → Person records. */
const readPeople = (raw: unknown, legacy: unknown): Person[] => {
  if (Array.isArray(raw)) {
    return raw.filter((p): p is Person => !!p && typeof p === 'object' && typeof (p as Person).name === 'string');
  }
  if (Array.isArray(legacy)) {
    return legacy
      .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
      .map((name) => ({ id: `legacy-${name.toLowerCase()}`, name }));
  }
  return [];
};

/** Legacy `locations: {name}[]` → Place records, category unknown. */
const readPlaces = (raw: unknown, legacy: unknown): Place[] => {
  if (Array.isArray(raw)) {
    return raw.filter((p): p is Place => !!p && typeof p === 'object' && typeof (p as Place).name === 'string');
  }
  if (Array.isArray(legacy)) {
    return legacy
      .filter((l): l is { name: string } => !!l && typeof (l as { name?: unknown }).name === 'string')
      .filter((l) => l.name.trim() !== '')
      .map((l) => ({
        id: `legacy-${l.name.toLowerCase()}`,
        name: l.name,
        category: 'other' as const,
        meaningful: false,
      }));
  }
  return [];
};

/** Legacy songName/songRating/songMeaning + watched → the two sound slots. */
const readSound = (raw: unknown, legacy: Record<string, unknown>): SoundSlots => {
  if (raw && typeof raw === 'object') {
    const slots = raw as Partial<SoundSlots>;
    return { listen: slots.listen ?? null, watch: slots.watch ?? null };
  }

  const out: SoundSlots = { listen: null, watch: null };
  const songName = str(legacy.songName);
  if (songName.trim() !== '') {
    out.listen = {
      mode: 'listen',
      mediaType: 'song',
      title: songName,
      subtitle: '',
      artworkUrl: '',
      rating: num(legacy.songRating),
      note: str(legacy.songMeaning),
      externalId: '',
    } satisfies SoundEntry;
  }
  const watched = str(legacy.watched);
  if (watched.trim() !== '') {
    out.watch = {
      mode: 'watch',
      mediaType: 'film',
      title: watched,
      subtitle: '',
      artworkUrl: '',
      rating: 0,
      note: '',
      externalId: '',
    } satisfies SoundEntry;
  }
  return out;
};

/**
 * Fill every field of a parsed record. Reads the new nested shape when present
 * and falls back to the legacy top-level fields when it isn't, so a day written
 * by the old screens opens correctly in the new UI.
 */
export const normaliseDayEntry = (parsed: unknown, dateKey: string): DayEntry => {
  const empty = emptyDayEntry(dateKey);
  if (!parsed || typeof parsed !== 'object') return empty;

  const legacy = parsed as Record<string, unknown>;
  const nested = (legacy[NEW_SHAPE_FIELD] ?? {}) as Record<string, unknown>;

  const capture = (nested.capture ?? {}) as Record<string, unknown>;
  const threeWords = (nested.threeWords ?? {}) as Record<string, unknown>;
  const story = (nested.story ?? {}) as Record<string, unknown>;
  const futureNote = (nested.futureNote ?? {}) as Record<string, unknown>;

  return {
    dateKey,
    capture: {
      mainPhotoUri: str(capture.mainPhotoUri) || str(legacy.photoUri),
      selfieUri: str(capture.selfieUri) || str(legacy.pairSelfieUri),
      selfieIsBig: bool(capture.selfieIsBig),
    },
    threeWords: {
      words: readWords(threeWords.words, legacy.threeWords),
      mood: str(threeWords.mood) || str(legacy.mood),
    },
    story: {
      text: str(story.text) || str(legacy.dayDescription),
      voiceNoteUri: str(story.voiceNoteUri) || str(legacy.voiceMemoUri),
      voiceNoteDuration: num(story.voiceNoteDuration),
    },
    sound: readSound(nested.sound, legacy),
    people: readPeople(nested.people, legacy.taggedPeople),
    places: readPlaces(nested.places, legacy.locations),
    learned: str(nested.learned) || str(legacy.learned),
    futureNote: {
      note: str(futureNote.note),
      when: (str(futureNote.when) || 'year') as DayEntry['futureNote']['when'],
      surfaceKey: str(futureNote.surfaceKey),
      isQuestion: bool(futureNote.isQuestion),
      reply: str(futureNote.reply),
    },
  };
};

// Every write goes through this chain, and every read waits for it.
//
// Editors call saveDayEntry() and dismiss straight away without waiting, and
// Today reloads the moment the sheet closes. Without this, that reload read
// storage while the save was still in flight and showed the OLD value — Done
// looked like it did nothing until the next reopen re-read a finished write.
// It also serialises saves, since each is a read-merge-write and two
// overlapping ones could overwrite each other's fields.
let writeChain: Promise<unknown> = Promise.resolve();

/** Load a day. A missing or corrupt record returns a safe empty one. */
export const loadDayEntry = async (dateKey: string): Promise<DayEntry> => {
  await writeChain;
  try {
    const raw = await AsyncStorage.getItem(storageKey(dateKey));
    if (!raw) return emptyDayEntry(dateKey);
    return normaliseDayEntry(JSON.parse(raw), dateKey);
  } catch {
    // a corrupt record must never block the screen
    return emptyDayEntry(dateKey);
  }
};

// ---------------------------------------------------------------------------
// WRITING
// ---------------------------------------------------------------------------

/**
 * Simplified OLD-style top-level fields, written alongside every new save so
 * the old screens (Your Days archive, DayCard, the Vault) — which read only
 * those fields and know nothing of the nested `chronicle` shape — can still see
 * a day filled in through the new editors. The mirror of the legacy READ
 * fallback in normaliseDayEntry, running the other way.
 *
 * Lossy on purpose: no "why" notes, place categories, ratings-as-stars, voice
 * durations. Reads prefer the nested shape, so this copy never feeds back.
 *
 * It must overwrite EVERY field, empties included. Reading falls back to the
 * legacy field when the nested one is empty, so a stale legacy value would
 * bring back something the user just cleared.
 */
const legacyMirror = (entry: DayEntry, stored: Record<string, unknown>): Record<string, unknown> => {
  // old locations carried a `withWho` the new shape has no room for — keep it
  const oldLocations = Array.isArray(stored.locations)
    ? (stored.locations as { name?: unknown; withWho?: unknown }[])
    : [];
  const withWhoByName = new Map<string, unknown>();
  oldLocations.forEach((l) => {
    if (typeof l?.name === 'string' && l.withWho) withWhoByName.set(l.name.toLowerCase(), l.withWho);
  });

  return {
    photoUri: entry.capture.mainPhotoUri,
    pairSelfieUri: entry.capture.selfieUri,
    mood: entry.threeWords.mood,
    threeWords: entry.threeWords.words.map((w) => w.word.trim()).filter(Boolean),
    dayDescription: entry.story.text,
    voiceMemoUri: entry.story.voiceNoteUri,
    songName: entry.sound.listen?.title ?? '',
    songRating: entry.sound.listen?.rating ?? 0,
    songMeaning: entry.sound.listen?.note ?? '',
    watched: entry.sound.watch?.title ?? '',
    taggedPeople: entry.people.map((p) => p.name),
    locations: entry.places
      .filter((p) => !p.mergedIntoId)
      .map((p) => {
        const withWho = withWhoByName.get(p.name.toLowerCase());
        return withWho ? { name: p.name, withWho } : { name: p.name };
      }),
    learned: entry.learned,
  };
};

/**
 * Merge a partial update into the stored record. Never overwrites the whole
 * thing:
 *   - unknown fields already in storage (legacy capsules, weather, the old
 *     daily/reflection answers) are preserved untouched
 *   - object groups merge, so `{ capture: { selfieUri } }` keeps mainPhotoUri
 *   - arrays and strings replace, which is the only sensible semantic for them
 *
 * Returns the saved record so callers can put it straight into state.
 */
export const saveDayEntry = (dateKey: string, patch: DayEntryPatch): Promise<DayEntry> => {
  const run = writeChain.then(() => writeDayEntry(dateKey, patch));
  writeChain = run.catch(() => {}); // one failed save must not block later ones
  return run;
};

const writeDayEntry = async (dateKey: string, patch: DayEntryPatch): Promise<DayEntry> => {
  let stored: Record<string, unknown> = {};
  try {
    const raw = await AsyncStorage.getItem(storageKey(dateKey));
    if (raw) stored = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    stored = {};
  }

  const current = normaliseDayEntry(stored, dateKey);

  const merged: DayEntry = {
    dateKey,
    capture: { ...current.capture, ...patch.capture },
    threeWords: { ...current.threeWords, ...patch.threeWords },
    story: { ...current.story, ...patch.story },
    sound: { ...current.sound, ...patch.sound },
    people: patch.people ?? current.people,
    places: patch.places ?? current.places,
    learned: patch.learned ?? current.learned,
    futureNote: { ...current.futureNote, ...patch.futureNote },
  };

  // spread `stored` first so untouched legacy fields (capsules, weather, the
  // daily answers) survive; the mirror then refreshes the ones the new editors
  // own, and the full new shape goes into its own field
  const record = { ...stored, ...legacyMirror(merged, stored), [NEW_SHAPE_FIELD]: merged };
  await AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(record));

  return merged;
};

// ---------------------------------------------------------------------------
// PROGRESS
// ---------------------------------------------------------------------------

/**
 * How many of the eight inputs hold something, for the progress ring. One per
 * editor, in tile order. An input counts the moment it holds anything real —
 * whitespace doesn't count, and a mood alone is enough for three words.
 */
export const countFilledInputs = (entry: DayEntry): number => {
  const filled = [
    entry.capture.mainPhotoUri !== '' || entry.capture.selfieUri !== '',
    entry.threeWords.words.some((w) => w.word.trim() !== '') || entry.threeWords.mood !== '',
    entry.story.text.trim() !== '' || entry.story.voiceNoteUri !== '',
    entry.sound.listen !== null || entry.sound.watch !== null,
    entry.people.length > 0,
    entry.places.some((p) => !p.mergedIntoId),
    entry.learned.trim() !== '',
    entry.futureNote.note.trim() !== '',
  ];
  return filled.filter(Boolean).length;
};

export const TOTAL_INPUTS = 8;
