// Emoji suggested from the words the user actually typed.
//
// The point is that Chronicle never guesses how you felt. It reflects your own
// words back and lets you confirm — which prompts reflection without presuming
// anything. A word that isn't in the map contributes nothing rather than being
// approximated.
//
// TO EXTEND: add a lowercase key and 1-3 emoji. Keys are matched against words
// lowercased and stripped of punctuation, so "Warm," and "warm" both hit. Order
// matters slightly — earlier emoji in a list appear first in the row.

const KEYWORD_EMOJI: Record<string, string[]> = {
  // warmth / calm
  warm: ['😌', '☀️', '🧡'],
  cosy: ['😌', '🧣', '🕯️'],
  cozy: ['😌', '🧣', '🕯️'],
  calm: ['😌', '🌊', '🍃'],
  peaceful: ['😌', '🕊️', '🍃'],
  quiet: ['🤫', '🍃'],
  still: ['🍃', '😌'],
  slow: ['🐌', '😪'],
  unhurried: ['😪', '🍃', '🐌'],
  restful: ['😴', '🛏️'],
  content: ['😌', '🙂'],

  // joy
  happy: ['😊', '😄', '🌞'],
  joyful: ['😄', '🎉'],
  excited: ['🤩', '⚡', '🎉'],
  fun: ['😄', '🎉'],
  silly: ['🤪', '😜'],
  funny: ['😂', '🤣'],
  laughing: ['😂', '🤣'],
  grateful: ['🥰', '🙏'],
  lucky: ['🍀', '🤞'],
  proud: ['😌', '🏆', '💪'],

  // people
  reunion: ['🥰', '🫂', '🎉'],
  together: ['🫂', '👯'],
  love: ['❤️', '🥰'],
  family: ['🏡', '👨‍👩‍👧'],
  friends: ['👯', '🫂'],
  lonely: ['😔', '🌧️'],
  missed: ['🥺', '💭'],

  // effort
  busy: ['😅', '🏃', '⚡'],
  productive: ['💪', '✅', '⚡'],
  focused: ['🎯', '🧠'],
  tired: ['😴', '🥱'],
  exhausted: ['😵', '😴'],
  drained: ['🫠', '😮‍💨'],
  stressed: ['😰', '🌪️'],
  overwhelmed: ['🫠', '🌪️'],

  // low
  sad: ['😔', '🌧️'],
  down: ['😔', '🌧️'],
  low: ['😔', '☁️'],
  anxious: ['😬', '🌪️'],
  worried: ['😟', '💭'],
  frustrated: ['😤', '🧱'],
  angry: ['😠', '🔥'],
  bored: ['😐', '🥱'],
  flat: ['😐', '☁️'],

  // the texture of a day
  rainy: ['🌧️', '☔'],
  sunny: ['☀️', '😎'],
  cold: ['🥶', '❄️'],
  hot: ['🥵', '🔥'],
  long: ['🕰️', '😮‍💨'],
  strange: ['🤨', '🌀'],
  chaotic: ['🌪️', '😵‍💫'],
  messy: ['🌀', '😵‍💫'],
  new: ['✨', '🌱'],
  fresh: ['🌱', '✨'],
  hopeful: ['🌱', '🤞', '✨'],
  nostalgic: ['🥹', '📼'],
  emotional: ['🥹', '💭'],
};

/** Shown when no typed word matches. The row must NEVER render empty. */
export const DEFAULT_MOODS = ['😞', '😐', '🙂', '😊', '🤩'];

/**
 * The full pickable set, behind the "+" in the mood row.
 *
 * Deliberately FINITE. The mood is a chosen value, not free text — a typed
 * field let letters through and put things like "He" in the mood slot. Faces
 * first, since a mood is usually a face, then the non-face moods people
 * actually reach for when describing a day.
 *
 * TO EXTEND: add to either group. Order here is the order shown.
 */
export const MOOD_PALETTE = [
  // faces
  '😀', '😃', '😄', '😁', '😆', '😊', '🙂', '🙃',
  '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', '🤗',
  '🤔', '🤨', '😐', '😑', '🙄', '😏', '😒', '😔',
  '😞', '😟', '🙁', '😣', '😖', '😫', '😩', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵',
  '🥶', '😱', '😰', '😥', '🥱', '😴', '🥳', '🤩',
  '😎', '🥹', '🫠', '😮‍💨', '😵‍💫', '🫡',
  // not faces — weather, hearts, symbols
  '❤️', '🧡', '💛', '💙', '💜', '🖤',
  '✨', '🌟', '🔥', '🌈', '☀️', '⛅️',
  '🌧️', '⛈️', '❄️', '🍃', '🌱', '🍀',
  '🎉', '🏆', '💪', '🙏', '🫂', '🕯️',
  '🌊', '🌪️', '☁️', '🕰️', '📼', '🌀',
];

const MAX_SUGGESTIONS = 6;

/** Lowercase, and strip anything that isn't a letter — "Warm," matches "warm". */
const normalise = (word: string) => word.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Emoji drawn from the user's own words, in the order the words were typed,
 * deduped and capped. Tops up with neutral faces so there's always a spread to
 * choose between, and falls back entirely to those if nothing matched.
 */
export const suggestMoods = (words: string[]): string[] => {
  const out: string[] = [];

  words.forEach((raw) => {
    const key = normalise(raw);
    if (!key) return;
    KEYWORD_EMOJI[key]?.forEach((emoji) => {
      if (!out.includes(emoji)) out.push(emoji);
    });
  });

  if (out.length === 0) return DEFAULT_MOODS;

  DEFAULT_MOODS.forEach((emoji) => {
    if (out.length < MAX_SUGGESTIONS && !out.includes(emoji)) out.push(emoji);
  });

  return out.slice(0, MAX_SUGGESTIONS);
};
