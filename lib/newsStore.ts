// Chronicle — per-headline selection state for the News editor
// (components/today/editors/NewsEditor.tsx). AsyncStorage-backed, same
// per-action-immediacy pattern as lib/photoStore.ts's helpers for
// CameraRollEditor: each toggle/comment writes straight away, no batch save.
//
// Headlines from GDELT have no stable id of their own, so each one is keyed by
// a hash of its title (djb2, same approach DayCard.tsx's hashUri uses for
// ImagePicker URIs, which also have no natural id).

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Headline } from '@/components/newsFeed';

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
  /**
   * A copy of the headline itself (title/domain/url), saved alongside the state so
   * this day's selection survives GDELT returning a different list on a later
   * fetch — see loadSavedHeadlines. Optional: absent on records saved before this
   * field existed. Those still load without crashing; they're just skipped by
   * loadSavedHeadlines (nothing to show without a title) and by the editor's own
   * merge (same reason).
   */
  headline?: Headline;
};

export const emptyHeadlineState: HeadlineState = {
  selected: true,
  comment: '',
  isMainStory: false,
  favouriteId: null,
};

const storageKey = (dateKey: string) => `news_selection_${dateKey}`;

// Never carry more than this many selected stories forward from an old save —
// a safety net for days saved before the 3-story cap existed (or by any other
// bug), mirroring NewsEditor.tsx's own MAX_SELECTED.
const MAX_SELECTED_SAFETY = 3;

export const loadNewsSelection = async (dateKey: string): Promise<Record<string, HeadlineState>> => {
  try {
    const raw = await AsyncStorage.getItem(storageKey(dateKey));
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};

    const entries = Object.entries(parsed as Record<string, HeadlineState>);
    let changed = false;

    // Drop pre-rebuild GDELT-era entries: they have a `headline` snapshot but
    // no `kind` ('event' | 'link'), since that field didn't exist until the
    // Wikipedia rebuild — keeping them would mix stale GDELT headlines in
    // alongside real Wikipedia events. Entries with NO headline at all are
    // left alone; they're already invisible to the editor (see
    // loadSavedHeadlines above) and harmless.
    const kindFiltered = entries.filter(([, st]) => !st.headline || !!st.headline.kind);
    if (kindFiltered.length !== entries.length) changed = true;

    let selectedSeen = 0;
    const capped = kindFiltered.map(([id, st]) => {
      if (!st.selected) return [id, st] as const;
      selectedSeen += 1;
      if (selectedSeen > MAX_SELECTED_SAFETY) {
        changed = true;
        return [id, { ...st, selected: false }] as const;
      }
      return [id, st] as const;
    });

    const result = Object.fromEntries(capped);
    // Write the cleaned/capped selection straight back, so this only costs
    // anything on the first load after the rebuild (or after any future bug
    // this safety net catches) — every load after that is already clean.
    if (changed) await saveNewsSelection(dateKey, result);
    return result;
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

export type SavedHeadline = Headline & {
  comment: string;
  isMainStory: boolean;
};

/**
 * This day's SELECTED headlines, rebuilt from their saved snapshots — no GDELT
 * call needed, so the Newspaper slide (or anything else) can read "today's page"
 * without re-fetching. Skips legacy records saved before snapshots existed
 * (selected but no `headline`) and anything not selected.
 */
export const loadSavedHeadlines = async (dateKey: string): Promise<SavedHeadline[]> => {
  const selection = await loadNewsSelection(dateKey);
  return Object.values(selection)
    .filter((st): st is HeadlineState & { headline: Headline } => st.selected && !!st.headline)
    .map((st) => ({ ...st.headline, comment: st.comment, isMainStory: st.isMainStory }));
};

// ---- "In other news" — one free-text note per day, separate from the headline
// map above and NOT counted toward the 3-story cap. ----

const otherNewsKey = (dateKey: string) => `other_news_${dateKey}`;

export const loadOtherNews = async (dateKey: string): Promise<string> =>
  (await AsyncStorage.getItem(otherNewsKey(dateKey))) ?? '';

export const saveOtherNews = async (dateKey: string, text: string): Promise<void> => {
  await AsyncStorage.setItem(otherNewsKey(dateKey), text);
};

// ---- "On this day" — up to 3 of Wikipedia's any-year facts for the date,
// picked in the News editor. Saved as a snapshot (not just a year/index) so a
// pick survives the source list changing, same reasoning as SavedHeadline's
// `headline` snapshot above. ----

export type OnThisDayFact = { year: number; text: string };

const onThisDayKey = (dateKey: string) => `on_this_day_${dateKey}`;

export const loadOnThisDay = async (dateKey: string): Promise<OnThisDayFact[]> => {
  try {
    const raw = await AsyncStorage.getItem(onThisDayKey(dateKey));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveOnThisDay = async (dateKey: string, facts: OnThisDayFact[]): Promise<void> => {
  await AsyncStorage.setItem(onThisDayKey(dateKey), JSON.stringify(facts));
};

// ---- Topic labels for the Newspaper slide's story headers, from the saved
// Headline's `category` (set by lib/currentEvents.ts from Wikipedia's Current
// events portal headings). Anything else — old GDELT-era saves, pasted links,
// or a heading Wikipedia doesn't use — shows no label. ----

const TOPIC_LABELS: Record<string, string> = {
  'Armed conflicts and attacks': 'CONFLICT',
  'Arts and culture': 'ARTS',
  'Business and economy': 'BUSINESS',
  'Disasters and accidents': 'DISASTERS',
  'Health and environment': 'HEALTH',
  'International relations': 'WORLD',
  'Law and crime': 'CRIME',
  'Politics and elections': 'POLITICS',
  'Science and technology': 'SCIENCE',
  Sports: 'SPORT',
};

export const topicLabel = (category?: string): string | null =>
  (category && TOPIC_LABELS[category]) || null;
