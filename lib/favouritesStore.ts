// Chronicle — small AsyncStorage helper for the Favourites list, so a new editor
// (NewsEditor) can add/remove entries without duplicating explore.tsx's inline
// loadFavourites/saveFavourites. Same key, same JSON shape as that file — both
// stay in sync. Mirrors the approach lib/photoStore.ts took for CameraRollEditor.

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

export const loadFavourites = async (): Promise<Favourite[]> => {
  try {
    const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveFavourites = async (list: Favourite[]): Promise<void> => {
  await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(list));
};

/** Prepends a new favourite (matches explore.tsx's own add-favourite ordering). Returns it, id included. */
export const addFavourite = async (fav: Omit<Favourite, 'id'>): Promise<Favourite> => {
  const withId: Favourite = { ...fav, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const current = await loadFavourites();
  await saveFavourites([withId, ...current]);
  return withId;
};

export const removeFavourite = async (id: string): Promise<void> => {
  const current = await loadFavourites();
  await saveFavourites(current.filter((f) => f.id !== id));
};

/** No-op if `id` isn't found (e.g. the favourite was deleted from the Favourites
 * tab directly) — the caller doesn't need to check first. */
export const updateFavouriteNote = async (id: string, note: string): Promise<void> => {
  const current = await loadFavourites();
  if (!current.some((f) => f.id === id)) return;
  await saveFavourites(current.map((f) => (f.id === id ? { ...f, note } : f)));
};
