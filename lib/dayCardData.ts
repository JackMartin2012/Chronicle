// Chronicle — the ONE shape the day card carousel reads.
//
// Built from a stored DayEntry plus the "live extras" that don't live in the
// entry (camera roll query, legacy weather). Every slide takes its slice of
// this and nothing else, so slides never touch storage or MediaLibrary.
//
// HIDE RULE (locked, Sept 2026): a slice is `null` when the day has nothing for
// that slide, and the carousel drops that slide entirely — no empty states.
// The cover is the one exception; it is generated, so it always exists.

import type { SavedHeadline } from './newsStore';
import type { DayEntry, Person, SoundSlots, ThreeWordsBlock } from './types';

// ---------------------------------------------------------------------------
// LIVE EXTRAS — gathered once when the carousel opens, never re-queried
// ---------------------------------------------------------------------------

export type CameraRollItem = {
  id: string;
  /** localUri from getAssetInfoAsync — never the raw ph:// asset.uri. */
  uri: string;
  kind: 'photo' | 'video';
  /** Creation time, ms since epoch — drives the polaroid's time caption. */
  takenAt: number;
  /** Seconds; videos only. */
  durationSec?: number;
};

/** Read-only, on-device query of the day's camera roll. */
export type CameraRollExtras = {
  /** 'denied' / 'unavailable' means the count and slide are simply absent. */
  status: 'granted' | 'denied' | 'unavailable';
  photoCount: number;
  videoCount: number;
  items: CameraRollItem[];
};

/**
 * The OLD top-level weather fields in the stored record. Not part of DayEntry —
 * read straight from the raw `day_entry_` JSON. fetchHistoricWeather is out of
 * scope for this pass (see 09_CODE_NOTES.md).
 */
export type LegacyWeather = {
  temp: number;
  emoji: string;
  description: string;
};

export type LiveExtras = {
  cameraRoll: CameraRollExtras | null;
  /** null when the record has no weather — see `readLegacyWeather`. */
  weather: LegacyWeather | null;
  /** This day's selected News-editor stories, from lib/newsStore.ts's loadSavedHeadlines. */
  savedHeadlines: SavedHeadline[];
  /** The News editor's "In other news" free-text box for this day; '' if unset. */
  otherNews: string;
  /** today_thumbnail_${dateKey} — the asset id chosen in the Camera Roll editor. Null if unset. */
  chosenThumbnailId: string | null;
  /** caption_${assetId} for each of this day's camera-roll items, keyed by id. */
  captions: Record<string, string>;
};

/** Slide 3's data — the live query plus the two storage-backed bits it needs to feel real. */
export type CameraRollSlideData = CameraRollExtras & {
  chosenThumbnailId: string | null;
  captions: Record<string, string>;
};

// ---------------------------------------------------------------------------
// THE SHAPE
// ---------------------------------------------------------------------------

export type DayCardData = {
  dateKey: string;
  date: Date;
  world: 'past' | 'present';

  /** Slide 1. Always present. Each metadata item is omitted when undefined. */
  cover: {
    weather?: LegacyWeather;
    mood?: string;
    /** Live camera roll query only. Undefined when access is denied OR there are none ("0" is noise). */
    photoCount?: number;
    people: Person[];
  };

  /** Slide 2. Null unless there is a main photo or a selfie. */
  capture: {
    mainPhotoUri: string;
    selfieUri: string;
    selfieIsBig: boolean;
    /** See Capture.capturedAt — undefined on old captures, never backfilled. */
    capturedAt?: number;
  } | null;

  /** Slide 3. Null when denied, or when the day has no camera roll items. */
  cameraRoll: CameraRollSlideData | null;

  /** Slide 4. Null when there are no words. */
  threeWords: ThreeWordsBlock | null;

  /** Slide 5. Null when there is no text and no voice note AND no learned. */
  story: {
    text: string;
    voiceNoteUri: string;
    voiceNoteDuration: number;
    learned: string;
  } | null;

  /** Slide 6. Null when both listen and watch are empty. */
  sound: SoundSlots | null;

  /**
   * Slide 8. Sourced from the News editor's saved picks (lib/newsStore.ts),
   * not the Wikipedia on-this-day archive (that's still used by the legacy
   * DayCard.tsx's World slide, independently — see newsFeed.ts).
   * `lead` is whichever selected story was pinned (isMainStory), or the first
   * selected one if none was pinned. `others` is the rest, capped at 2. Null
   * (slide hidden) when there are no selected stories AND no "In other news"
   * text for the day.
   */
  newspaper: {
    lead?: SavedHeadline;
    others: SavedHeadline[];
    otherNews: string;
  } | null;
};

// ---------------------------------------------------------------------------
// BUILDING IT
// ---------------------------------------------------------------------------

/** Legacy weather counts as present only if emoji or description is set —
 *  `weatherTemp` alone can't say, because an unset record stores 0. */
export const readLegacyWeather = (raw: unknown): LegacyWeather | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const emoji = typeof r.weatherEmoji === 'string' ? r.weatherEmoji : '';
  const description = typeof r.weatherDescription === 'string' ? r.weatherDescription : '';
  if (!emoji && !description) return null;
  const temp = typeof r.weatherTemp === 'number' && isFinite(r.weatherTemp) ? r.weatherTemp : 0;
  return { temp, emoji, description };
};

export const buildDayCardData = (
  entry: DayEntry,
  extras: LiveExtras,
  world: 'past' | 'present'
): DayCardData => {
  const roll = extras.cameraRoll;
  const rollHasItems = !!roll && roll.status === 'granted' && roll.items.length > 0;
  const { capture, story, sound } = entry;

  const wordsFilled = entry.threeWords.words.some((w) => w.word.trim().length > 0);
  const storyHas = !!story.text.trim() || !!story.voiceNoteUri || !!entry.learned.trim();
  const soundHas = !!sound.listen || !!sound.watch;

  return {
    dateKey: entry.dateKey,
    date: new Date(`${entry.dateKey}T12:00:00`),
    world,

    cover: {
      weather: extras.weather ?? undefined,
      mood: entry.threeWords.mood || undefined,
      photoCount: roll && roll.status === 'granted' ? roll.photoCount || undefined : undefined,
      people: entry.people,
    },

    capture:
      capture.mainPhotoUri || capture.selfieUri
        ? {
            mainPhotoUri: capture.mainPhotoUri,
            selfieUri: capture.selfieUri,
            selfieIsBig: capture.selfieIsBig,
            capturedAt: capture.capturedAt,
          }
        : null,

    cameraRoll: rollHasItems ? { ...roll, chosenThumbnailId: extras.chosenThumbnailId, captions: extras.captions } : null,
    threeWords: wordsFilled ? entry.threeWords : null,
    story: storyHas
      ? {
          text: story.text,
          voiceNoteUri: story.voiceNoteUri,
          voiceNoteDuration: story.voiceNoteDuration,
          learned: entry.learned,
        }
      : null,
    sound: soundHas ? sound : null,
    newspaper: (() => {
      const selected = extras.savedHeadlines;
      const hasOtherNews = extras.otherNews.trim().length > 0;
      if (selected.length === 0 && !hasOtherNews) return null;
      const lead = selected.find((h) => h.isMainStory) ?? selected[0];
      const others = lead ? selected.filter((h) => h !== lead).slice(0, 2) : [];
      return { lead, others, otherNews: extras.otherNews };
    })(),
  };
};
