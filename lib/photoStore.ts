// Chronicle — small AsyncStorage helpers for per-photo data keyed by MediaLibrary
// asset id. Each write is immediate (no batching); the Camera Roll editor calls
// these per action. The legacy DayCard.tsx still does the same reads/writes
// inline for its own screens — same keys, same JSON shapes, so both stay in sync.

import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDDEN_KEY = 'hidden_photos';
const FAVOURITED_KEY = 'favourited_photos';

const readIdList = async (key: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

// ---- captions: caption_${assetId} (string) ----

export const loadCaption = async (assetId: string): Promise<string> =>
  (await AsyncStorage.getItem(`caption_${assetId}`)) ?? '';

/** Many at once — one storage round trip instead of one per photo. */
export const loadCaptions = async (assetIds: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  if (assetIds.length === 0) return out;
  const rows = await AsyncStorage.multiGet(assetIds.map((id) => `caption_${id}`));
  rows.forEach(([, val], i) => {
    if (val) out[assetIds[i]] = val;
  });
  return out;
};

export const saveCaption = async (assetId: string, caption: string): Promise<void> => {
  await AsyncStorage.setItem(`caption_${assetId}`, caption);
};

// ---- hidden photos: hidden_photos (JSON array of asset ids) ----

export const loadHiddenPhotos = (): Promise<string[]> => readIdList(HIDDEN_KEY);

export const hidePhoto = async (assetId: string): Promise<string[]> => {
  const hidden = await readIdList(HIDDEN_KEY);
  if (!hidden.includes(assetId)) hidden.push(assetId);
  await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  return hidden;
};

// ---- favourited photos: favourited_photos (JSON array of asset ids) ----
// TODO: nothing reads this yet — it's the flag for the future Favourites feature.

export const loadFavouritedPhotos = (): Promise<string[]> => readIdList(FAVOURITED_KEY);

/** Adds the id if absent, removes it if present. Returns the new list. */
export const toggleFavouritedPhoto = async (assetId: string): Promise<string[]> => {
  const current = await readIdList(FAVOURITED_KEY);
  const next = current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId];
  await AsyncStorage.setItem(FAVOURITED_KEY, JSON.stringify(next));
  return next;
};

// ---- the day's chosen thumbnail: today_thumbnail_${dateKey} (asset id, not a URI) ----
// Deliberately separate from the legacy tc_thumb_ keys the Past tab's Vault uses.

export const thumbnailKey = (dateKey: string) => `today_thumbnail_${dateKey}`;

export const loadTodayThumbnail = async (dateKey: string): Promise<string | null> =>
  AsyncStorage.getItem(thumbnailKey(dateKey));

export const saveTodayThumbnail = async (dateKey: string, assetId: string): Promise<void> => {
  await AsyncStorage.setItem(thumbnailKey(dateKey), assetId);
};
