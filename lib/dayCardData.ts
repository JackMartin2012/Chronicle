// Chronicle — the ONE shape the day card carousel reads.
//
// Built from a stored DayEntry plus the "live extras" that don't live in the
// entry (camera roll query, legacy weather). Every slide takes its slice of
// this and nothing else, so slides never touch storage or MediaLibrary.
//
// HIDE RULE (locked, Sept 2026): a slice is `null` when the day has nothing for
// that slide, and the carousel drops that slide entirely — no empty states.
// The cover is the one exception; it is generated, so it always exists.

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
  /**
   * Wikipedia on-this-day events for the day, from newsFeed's loadNewsForDay
   * (30-day cache; respects the wiki setting). Empty when off or offline.
   */
  archive: { year: number; text: string }[];
  /** null when the record has no weather — see `readLegacyWeather`. */
  weather: LegacyWeather | null;
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
    /** From the live camera roll query only; undefined when access is denied. */
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
  cameraRoll: CameraRollExtras | null;

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
   * Slide 8. Filled from the Wikipedia archive only (max 2 entries). The
   * reflection block is hidden (futureNote is not a reaction to the news) and
   * `lead` stays unset until a headline-save feature exists. Null when there
   * are no archive entries, which hides the slide.
   */
  newspaper: {
    lead?: { headline: string; source: string; reaction: string };
    archive: { year: string; event: string }[];
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
      photoCount: roll && roll.status === 'granted' ? roll.photoCount : undefined,
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

    cameraRoll: rollHasItems ? roll : null,
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
    newspaper:
      extras.archive.length > 0
        ? { archive: extras.archive.slice(0, 2).map((e) => ({ year: String(e.year), event: e.text })) }
        : null,
  };
};
