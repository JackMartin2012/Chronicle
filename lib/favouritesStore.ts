// Chronicle — small AsyncStorage helper for the Favourites list, so a new editor
// (NewsEditor) can add/remove entries without duplicating explore.tsx's inline
// loadFavourites/saveFavourites. Same key, same JSON shape as that file — both
// stay in sync. Mirrors the approach lib/photoStore.ts took for CameraRollEditor.
//
// Oct 2026 fix: every write here used to do its own independent read-modify-
// write (load the whole list, change one row, save the whole list back) with
// nothing serialising them. SoundEditor.tsx's handleDone fired an untracked
// note update and an untracked rating update back to back, and NewsEditor.tsx
// fired a note update on every keystroke — any two of these overlapping could
// each read the list before the other's write landed, so whichever write
// finished last won and silently discarded the other's change. All writes now
// go through one queue (`enqueue`) so they run strictly one at a time.

import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVOURITES_KEY = 'favourites';

// Matches the `Favourite` type declared inline in app/(tabs)/explore.tsx.
// Not imported from there (that file exports nothing) — kept in sync by hand.
export type Favourite = {
  id: string;
  category: string;
  name: string;
  rating: number;
  note: string;
  photoUri: string;
  dateKey: string;
  displayDate: string;
};

// One-off cleanup for exact duplicates a past bug could create (same name,
// category, dateKey AND note) — keeps the newest. addFavourite always
// prepends, so the list is newest-first: the FIRST occurrence of a key is
// the newest, and is the one kept.
const dedupeExactMatches = (list: Favourite[]): Favourite[] => {
  const seen = new Set<string>();
  const deduped: Favourite[] = [];
  for (const f of list) {
    const key = `${f.name}\u0000${f.category}\u0000${f.dateKey}\u0000${f.note}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(f);
  }
  return deduped;
};

// Set before the first await, not after, so a second overlapping call to
// loadFavourites() (e.g. two screens' mount effects firing at app start)
// sees it immediately and doesn't also try to run the cleanup — not a
// perfect lock, but enough for a one-off migration that only ever matters
// once, the first time this module is used in a session.
let dedupeRan = false;

export const loadFavourites = async (): Promise<Favourite[]> => {
  const runDedupe = !dedupeRan;
  dedupeRan = true;
  try {
    const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    let list: Favourite[] = Array.isArray(parsed) ? parsed : [];

    if (runDedupe) {
      const deduped = dedupeExactMatches(list);
      if (deduped.length !== list.length) {
        list = deduped;
        // A direct write, NOT enqueue(): this always runs on the very first
        // loadFavourites() call of the session, before anything else could
        // have been queued against this key — enqueue()'ing it here would
        // deadlock, since every queued function (addFavourite etc.) itself
        // calls loadFavourites() and would be waiting on this same write.
        await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(list));
        notify(list);
      }
    }
    return list;
  } catch {
    return [];
  }
};

const saveFavourites = async (list: Favourite[]): Promise<void> => {
  await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(list));
};

// ---- write queue: every exported write below runs through this, so no two
// read-modify-write operations on the 'favourites' key can ever overlap ----
let writeQueue: Promise<unknown> = Promise.resolve();

const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(() => fn(), () => fn()); // runs fn regardless of a prior failure
  writeQueue = run.then(() => undefined, () => undefined); // keep the chain alive past a failure too
  return run;
};

// ---- subscribe: fires after every successful write, with the new list, so a
// screen can stay current without polling or needing a tab-focus reload ----
const listeners = new Set<(list: Favourite[]) => void>();

export const subscribeFavourites = (fn: (list: Favourite[]) => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = (list: Favourite[]) => {
  listeners.forEach((fn) => fn(list));
};

/**
 * Queued "replace the whole list" writer, for callers (explore.tsx) that
 * build the next array themselves — e.g. prepending a new manually-added
 * favourite — rather than patching one row by id. Goes through the same
 * queue as everything else, so it can't race an editor's in-flight update.
 */
export const saveFavouritesList = (list: Favourite[]): Promise<void> =>
  enqueue(async () => {
    await saveFavourites(list);
    notify(list);
  });

/**
 * Prepends a new favourite (matches explore.tsx's own add-favourite
 * ordering) — UNLESS one with the same name, category and dateKey already
 * exists, in which case that existing row is reused (its other fields
 * updated to the latest) instead of adding a duplicate. A caller never needs
 * to check first.
 */
export const addFavourite = (fav: Omit<Favourite, 'id'>): Promise<Favourite> =>
  enqueue(async () => {
    const current = await loadFavourites();
    const existingIndex = current.findIndex(
      (f) => f.name === fav.name && f.category === fav.category && f.dateKey === fav.dateKey
    );
    if (existingIndex !== -1) {
      const reused: Favourite = { ...current[existingIndex], ...fav, id: current[existingIndex].id };
      const next = current.map((f, i) => (i === existingIndex ? reused : f));
      await saveFavourites(next);
      notify(next);
      return reused;
    }
    const withId: Favourite = { ...fav, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    const next = [withId, ...current];
    await saveFavourites(next);
    notify(next);
    return withId;
  });

export const removeFavourite = (id: string): Promise<void> =>
  enqueue(async () => {
    const current = await loadFavourites();
    const next = current.filter((f) => f.id !== id);
    await saveFavourites(next);
    notify(next);
  });

/** No-op if `id` isn't found (e.g. the favourite was deleted from the Favourites
 * tab directly) — the caller doesn't need to check first. */
export const updateFavouriteNote = (id: string, note: string): Promise<void> =>
  enqueue(async () => {
    const current = await loadFavourites();
    if (!current.some((f) => f.id === id)) return;
    const next = current.map((f) => (f.id === id ? { ...f, note } : f));
    await saveFavourites(next);
    notify(next);
  });

/** No-op if `id` isn't found, same as updateFavouriteNote. */
export const updateFavouriteRating = (id: string, rating: number): Promise<void> =>
  enqueue(async () => {
    const current = await loadFavourites();
    if (!current.some((f) => f.id === id)) return;
    const next = current.map((f) => (f.id === id ? { ...f, rating } : f));
    await saveFavourites(next);
    notify(next);
  });

// ---- debounced note updates: a comment field (NewsEditor.tsx) calls
// updateFavouriteNote on every keystroke today; that's a lot of queued writes
// while typing. scheduleFavouriteNoteUpdate waits ~400ms after the last
// keystroke before actually writing. Only one editor is ever open at a time
// in this app, so a single module-level pending slot is enough — there's
// never a second field debouncing concurrently. flushFavouriteNoteUpdate must
// be called when the editor closes, so a pending update isn't silently lost
// if the user types then closes within the debounce window. ----
const NOTE_DEBOUNCE_MS = 400;
let pendingNote: { id: string; note: string; timer: ReturnType<typeof setTimeout> } | null = null;

export const scheduleFavouriteNoteUpdate = (id: string, note: string): void => {
  if (pendingNote) clearTimeout(pendingNote.timer);
  const timer = setTimeout(() => {
    pendingNote = null;
    updateFavouriteNote(id, note);
  }, NOTE_DEBOUNCE_MS);
  pendingNote = { id, note, timer };
};

export const flushFavouriteNoteUpdate = (): Promise<void> => {
  if (!pendingNote) return Promise.resolve();
  const { id, note, timer } = pendingNote;
  clearTimeout(timer);
  pendingNote = null;
  return updateFavouriteNote(id, note);
};
