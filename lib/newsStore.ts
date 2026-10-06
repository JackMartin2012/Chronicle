// Chronicle — per-headline selection state for the News editor
// (components/today/editors/NewsEditor.tsx). AsyncStorage-backed, same
// per-action-immediacy pattern as lib/photoStore.ts's helpers for
// CameraRollEditor: each toggle/comment writes straight away, no batch save.
//
// Headlines from GDELT have no stable id of their own, so each one is keyed by
// a hash of its title (djb2, same approach DayCard.tsx's hashUri uses for
// ImagePicker URIs, which also have no natural id).

import AsyncStorage from '@react-native-async-storage/async-storage';

export const headlineId = (title: string): string => {
  let h = 5381;
  for (let i = 0; i < title.length; i++) {
    h = ((h << 5) + h + title.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
};

export type HeadlineState = {
  /** Included in today's page. All headlines default to true. */
  selected: boolean;
  comment: string;
  /** Only one headline may be true at a time — the editor enforces this. */
  isMainStory: boolean;
  /** The Favourites-list row this headline is linked to, or null if not favourited. */
  favouriteId: string | null;
};

export const emptyHeadlineState: HeadlineState = {
  selected: true,
  comment: '',
  isMainStory: false,
  favouriteId: null,
};

const storageKey = (dateKey: string) => `news_selection_${dateKey}`;

export const loadNewsSelection = async (dateKey: string): Promise<Record<string, HeadlineState>> => {
  try {
    const raw = await AsyncStorage.getItem(storageKey(dateKey));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveNewsSelection = async (
  dateKey: string,
  selection: Record<string, HeadlineState>
): Promise<void> => {
  await AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(selection));
};
