import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorld, motion, palette, space, type } from '@/constants/chronicleTheme';
import EditorFooterProgress from '../EditorFooterProgress';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';
import { countFilledInputs, formatDateKey, loadDayEntry, saveDayEntry } from '@/lib/dayEntry';
import {
  addFavourite,
  loadFavourites,
  removeFavourite,
  subscribeFavourites,
  updateFavouriteNote,
  updateFavouriteRating,
} from '@/lib/favouritesStore';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_RATIO = 0.9; // resting sheet height as a share of the screen — stable across search/hero states

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W50 = 'rgba(255,255,255,0.5)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const INPUT_BG = '#16233d';
const BACKDROP = 'rgba(0,0,0,0.55)';

// same rgba-from-hex helper SlideSound uses for its glow
// Everything in the hero except the artwork: its vertical padding (2x12) and
// margin (8), a two-line title, subtitle, Change, rating label and pill row,
// the note label + box + bottom padding (~154), plus slack. Generous on
// purpose — too small a number pushes the note off the bottom of the sheet.
const HERO_FIXED = 404;

const NOTE_BOX_H = 88; // the note input's fixed height
const NOTE_LEAD = 96; // how far above the note box to scroll to (keeps its label + some air in view)

const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ---- types (local only, not persisted) ----
type MediaType = 'song' | 'podcast' | 'film' | 'tv';
type SoundMode = 'listen' | 'watch';
type SoundEntry = {
  mode: SoundMode;
  mediaType: MediaType;
  title: string;
  subtitle: string; // artist, or release year for film
  artworkUrl: string;
  rating: number; // 1-10, 0 = unrated
  note: string;
  externalId: string; // iTunes trackId/collectionId
  // Local duplicate of lib/types.ts's SoundEntry (see its own note on that
  // duplication) — needs the same field so favouriting can set/read it.
  favouriteId?: string | null;
};

// No dedicated "Podcast" category exists in explore.tsx's favCategories —
// podcasts favourite under Song, the closest fit, same as film/tv both
// favourite under the one "Movie / TV" category.
const FAVOURITE_CATEGORY_BY_MEDIA: Record<MediaType, string> = {
  song: 'song',
  podcast: 'song',
  film: 'movie',
  tv: 'movie',
};

// Identity check for "is this the SAME pick" — used to decide whether a
// stored slot is a safe base to merge a favouriteId into, or just stale data
// left over from before "Change" swapped in something else. externalId is
// the iTunes id, stable and unique; title is the fallback for entries with
// none (a film with no iTunes match, resolved via Wikipedia instead).
const isSameTrack = (a: SoundEntry, b: SoundEntry): boolean =>
  a.externalId && b.externalId ? a.externalId === b.externalId : a.title === b.title;

const TITLE_BY_MODE: Record<SoundMode, string> = {
  listen: 'What did you listen to today?',
  watch: 'What did you watch today?',
};
const PLACEHOLDER_BY_MODE: Record<SoundMode, string> = {
  listen: 'Search for a song or podcast…',
  watch: 'Search for a film or show…',
};
const EMPTY_BY_MODE: Record<SoundMode, string> = {
  listen: 'Search for what you had on today',
  watch: 'Search for what you watched',
};
const SEGMENTS: { mode: SoundMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'listen', icon: 'headset-outline', label: 'Listen' },
  { mode: 'watch', icon: 'play-circle-outline', label: 'Watch' },
];
const TYPE_LABEL: Record<MediaType, string> = { song: 'Song', podcast: 'Podcast', film: 'Film', tv: 'TV' };
const NOTE_PLACEHOLDER: Record<MediaType, string> = {
  song: 'Why did this stick with you today?',
  podcast: 'Which episode? How did it land?',
  film: 'What did you make of it?',
  tv: 'Which episode? What happened?',
};

// each mode fires two iTunes requests in parallel, merged into one list
const ITUNES = 'https://itunes.apple.com/search';
type SearchRequest = {
  mediaType: MediaType;
  url: (q: string) => string;
  // sources that aren't iTunes-shaped supply their own response parser
  parse?: (json: any) => SoundEntry[];
};

// Films: Apple's iTunes Search returns ZERO movies for any title now (music and
// TV still work), so film search uses Wikipedia's free, keyless API instead.
// It matches titles well and gives year + director, but posters are non-free
// and almost never come back, so film entries usually have no artwork.
const WIKI = 'https://en.wikipedia.org/w/api.php';
const NOT_A_FILM = /soundtrack|series|franchise|characters|novel|disambiguation|filmography|album|television|topics referred/i;

const parseWikiFilms = (json: any): SoundEntry[] => {
  const pages: any[] = Object.values(json?.query?.pages ?? {});
  pages.sort((a, b) => a.index - b.index);
  return pages
    .filter((p) => typeof p.description === 'string' && /\bfilm(?: by .+)?$/i.test(p.description) && !NOT_A_FILM.test(p.description))
    .slice(0, 8)
    .map((p): SoundEntry => {
      // "2010 film by Christopher Nolan" → "2010 · Christopher Nolan"
      const m = /^(\d{4})\b.*?\bfilm\b(?: by (.+))?$/i.exec(p.description);
      const subtitle = m ? [m[1], m[2]].filter(Boolean).join(' · ') : p.description;
      return {
        mode: 'watch',
        mediaType: 'film',
        // "Parasite (2019 film)" → "Parasite"; the year is in the subtitle
        title: String(p.title).replace(/\s*\((?:\d{4} )?film\)$/i, ''),
        subtitle,
        artworkUrl: p.thumbnail?.source ?? '',
        rating: 0,
        note: '',
        externalId: String(p.pageid),
      };
    });
};

const REQUESTS: Record<SoundMode, SearchRequest[]> = {
  listen: [
    { mediaType: 'song', url: (q) => `${ITUNES}?term=${q}&media=music&entity=song&limit=8` },
    { mediaType: 'podcast', url: (q) => `${ITUNES}?term=${q}&media=podcast&limit=6` },
  ],
  watch: [
    {
      mediaType: 'film',
      url: (q) =>
        `${WIKI}?action=query&format=json&generator=search&gsrsearch=${q}%20film&gsrlimit=15&prop=pageimages%7Cdescription&piprop=thumbnail&pithumbsize=300&pilimit=15&origin=*`,
      parse: parseWikiFilms,
    },
    { mediaType: 'tv', url: (q) => `${ITUNES}?term=${q}&media=tvShow&entity=tvSeason&limit=6` },
  ],
};

// interleave lists so the first result of each type appears near the top
const interleave = (lists: SoundEntry[][]): SoundEntry[] => {
  const out: SoundEntry[] = [];
  const maxLen = lists.reduce((m, l) => Math.max(m, l.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return out;
};

// map one iTunes result → SoundEntry
const mapResult = (r: any, mediaType: MediaType): SoundEntry => {
  const artworkUrl = typeof r.artworkUrl100 === 'string' ? r.artworkUrl100.replace('100x100', '300x300') : '';
  const title = r.trackName || r.collectionName || '';
  let subtitle = r.artistName || '';
  if (mediaType === 'film' && r.releaseDate) {
    const y = new Date(r.releaseDate).getFullYear();
    subtitle = Number.isNaN(y) ? '' : String(y);
  }
  const externalId = String(r.trackId || r.collectionId || '');
  const mode: SoundMode = mediaType === 'song' || mediaType === 'podcast' ? 'listen' : 'watch';
  return { mode, mediaType, title, subtitle, artworkUrl, rating: 0, note: '', externalId };
};

// canonical AnimatedCard (per CLAUDE.md), parameterised by motion tokens
const AnimatedCard = ({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: motion.pressScale,
      useNativeDriver: true,
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1} style={{ flex: 1 }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SoundEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  const [mode, setMode] = useState<SoundMode>('listen');
  const [displayMode, setDisplayMode] = useState<SoundMode>('listen'); // lags behind mode for the title cross-fade
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SoundEntry[]>([]);
  const [error, setError] = useState(false);
  // two independent slots — one per mode; picking a song does not clear a chosen film
  const [entries, setEntries] = useState<{ listen: SoundEntry | null; watch: SoundEntry | null }>({
    listen: null,
    watch: null,
  });
  const [completed, setCompleted] = useState(0);
  const [heroH, setHeroH] = useState(0);
  // The hero is invisible at 0. selectResult animates it in; a seeded entry
  // never goes through selectResult, so seeding must set it to 1 itself.
  const heroAnim = useRef(new Animated.Value(0)).current; // 0 → 1: hero scale-in + fade

  // Clears any `favouriteId` on either slot that no longer exists in the real
  // Favourites list (e.g. deleted there since this was last saved), mutating
  // them in place so the caller can save/display the result directly.
  const dropStaleFavouriteLinks = (
    slots: { listen: SoundEntry | null; watch: SoundEntry | null },
    knownIds: Set<string>
  ): boolean => {
    let changed = false;
    (['listen', 'watch'] as const).forEach((m) => {
      const e = slots[m];
      if (e?.favouriteId && !knownIds.has(e.favouriteId)) {
        slots[m] = { ...e, favouriteId: null };
        changed = true;
      }
    });
    return changed;
  };

  // Seed from today's record so reopening shows both slots as you left them,
  // and lands on whichever side you actually filled.
  useEffect(() => {
    let active = true;
    Promise.all([loadDayEntry(formatDateKey(new Date())), loadFavourites()]).then(([day, favourites]) => {
      if (!active) return;
      const slots = { listen: day.sound.listen, watch: day.sound.watch };
      const knownIds = new Set(favourites.map((f) => f.id));
      // The star must follow the real list — a favourite deleted from the
      // Favourites tab since this was saved must show as off on reopen, not
      // stay lit forever.
      if (dropStaleFavouriteLinks(slots, knownIds)) {
        saveDayEntry(formatDateKey(new Date()), { sound: slots });
      }
      if (slots.listen || slots.watch) heroAnim.setValue(1);
      setEntries(slots);
      if (!slots.listen && slots.watch) {
        setMode('watch');
        setDisplayMode('watch');
      }
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, [heroAnim]);

  // While this editor stays open, the star must switch off the moment its
  // favourite is deleted elsewhere (the Favourites tab), not just on the
  // next reopen.
  useEffect(() => {
    const unsubscribe = subscribeFavourites((favourites) => {
      const knownIds = new Set(favourites.map((f) => f.id));
      setEntries((prev) => {
        const slots = { ...prev };
        if (!dropStaleFavouriteLinks(slots, knownIds)) return prev;
        saveDayEntry(formatDateKey(new Date()), { sound: slots });
        return slots;
      });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entry = entries[mode]; // the current mode's slot
  const anyFilled = !!entries.listen || !!entries.watch;
  const bothFilled = !!entries.listen && !!entries.watch;

  // The sheet is FIXED-HEIGHT and bottom-anchored, so KeyboardAvoidingView's
  // padding behaviour translates the whole thing upward and takes the title and
  // top row off screen. Instead the keyboard height is tracked directly: the
  // sheet's top edge stays put, its bottom sits on the keyboard, and the middle
  // absorbs the difference. Ported from StoryEditor.tsx.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const keyboardUp = keyboardHeight > 0;

  // Bring the note field into view. The scroll is driven by keyboardDidShow, which
  // fires only after the keyboard animation has finished and the sheet has laid
  // out at its final size — so there is no delay to guess. If the keyboard is
  // ALREADY up when the note is focused (it stays up after picking a search
  // result), nothing more will fire, so onFocus scrolls straight away.
  const heroScrollRef = useRef<ScrollView>(null);
  const noteY = useRef(0); // top of the note box inside the scroll content
  const heroContentH = useRef(0);
  const heroViewH = useRef(0);
  const noteFocusedRef = useRef(false);
  const keyboardShownRef = useRef(false);

  const scrollToNote = () => {
    const max = Math.max(0, heroContentH.current - heroViewH.current);
    // aim for the label + a little air above the box; but never let the box's
    // bottom edge fall below the visible area on a short viewport
    const wanted = Math.min(noteY.current - NOTE_LEAD, max);
    const boxBottomVisible = noteY.current + NOTE_BOX_H - heroViewH.current;
    const y = Math.min(Math.max(0, wanted, boxBottomVisible), max);
    heroScrollRef.current?.scrollTo({ y, animated: true });
  };
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      keyboardShownRef.current = true;
      if (noteFocusedRef.current) scrollToNote();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardShownRef.current = false;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const onNoteFocus = () => {
    noteFocusedRef.current = true;
    if (keyboardShownRef.current) scrollToNote();
  };
  const onNoteBlur = () => {
    noteFocusedRef.current = false;
  };

  // Resting height: a share of the screen, but never so tall that the top edge
  // reaches the status bar / notch (grabber, Done row, title and toggle stay clear).
  const restHeight = Math.min(Math.round(SCREEN_H * SHEET_RATIO), SCREEN_H - insets.top - space.base);
  // with the keyboard up, never taller than the space left above it
  const sheetHeight = keyboardUp
    ? Math.min(restHeight, SCREEN_H - keyboardHeight - insets.top - space.sm)
    : restHeight;

  const titleOpacity = useRef(new Animated.Value(1)).current;
  const pillScales = useRef(Array.from({ length: 10 }, () => new Animated.Value(1))).current;
  const firstTitleRun = useRef(true);

  // title cross-fade when the mode changes (skip on first mount)
  useEffect(() => {
    if (firstTitleRun.current) {
      firstTitleRun.current = false;
      return;
    }
    Animated.timing(titleOpacity, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setDisplayMode(mode);
      Animated.timing(titleOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  }, [mode, titleOpacity]);

  // debounced dual iTunes search (search state only), merged + interleaved
  useEffect(() => {
    if (entry) return; // hero state — don't search
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(false);
      return;
    }
    const controller = new AbortController();
    const encoded = encodeURIComponent(q);
    const t = setTimeout(async () => {
      const outcomes = await Promise.all(
        REQUESTS[mode].map((req) =>
          fetch(req.url(encoded), { signal: controller.signal })
            .then((res) => res.json())
            .then((json) => ({
              ok: true,
              items: (req.parse ? req.parse(json) : (json.results || []).map((r: any) => mapResult(r, req.mediaType)))
                // films may legitimately have no poster; everything else needs artwork
                .filter((x: SoundEntry) => x.title && (x.artworkUrl || x.mediaType === 'film')),
            }))
            .catch(() => ({ ok: false, items: [] as SoundEntry[] }))
        )
      );
      if (controller.signal.aborted) return;
      if (!outcomes.some((o) => o.ok)) {
        // only fail if BOTH requests failed
        setError(true);
        setResults([]);
        return;
      }
      setError(false);
      setResults(interleave(outcomes.map((o) => o.items)));
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, mode, entry]);

  const switchMode = (next: SoundMode) => {
    if (next === mode) return;
    setMode(next);
    setQuery('');
    setResults([]);
    setError(false);
    // keep any selected entry
  };

  const selectResult = (r: SoundEntry) => {
    setEntries((prev) => ({ ...prev, [mode]: r }));
    heroAnim.setValue(0);
    Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const changeSelection = () => {
    const cur = entries[mode];
    setEntries((prev) => ({ ...prev, [mode]: null })); // keeps the previous query → search re-runs
    // If the entry being replaced was linked to a favourite, clear that link
    // in storage right away. Change never otherwise touches storage, so the
    // stored slot would keep describing the OLD song indefinitely — and the
    // next star-tap on whatever's picked next could mistake it for the
    // current pick (see toggleFavourite's isSameTrack guard, which this
    // makes doubly sure of). The favourite row itself is untouched.
    if (cur?.favouriteId) {
      const dateKey = formatDateKey(new Date());
      loadDayEntry(dateKey).then((current) => {
        const storedSlot = current.sound[mode];
        if (storedSlot && storedSlot.favouriteId === cur.favouriteId) {
          saveDayEntry(dateKey, { sound: { [mode]: { ...storedSlot, favouriteId: null } } });
        }
      });
    }
  };

  // Mirrors NewsEditor.tsx's toggleFavourite: adds/removes a real Favourites
  // row, immediately, and keeps the link on the entry so it survives reopening
  // (once Done saves it — see handleDone; this editor batch-saves on Done,
  // same as rating/note, rather than per-action like NewsEditor).
  // Reads fresh from storage rather than using live `entries` state, because
  // `entries` can hold unsaved edits (rating/note typed, or even a brand-new
  // pick) that the chevron is meant to discard. ORPHAN BUG this fixes: the
  // favouriteId link itself used to live only in that same unsaved local
  // state, so a chevron-dismiss lost the link — the star showed off on
  // reopen, and tapping it again created a duplicate Favourites row. The link
  // (and, for a never-saved slot, the whole entry — see below) is now written
  // to the day record immediately, same partial-merge saveDayEntry() every
  // other editor uses, so it survives however the sheet closes.
  const toggleFavourite = async () => {
    if (!entry) return;
    const dateKey = formatDateKey(new Date());
    const current = await loadDayEntry(dateKey);
    const storedSlot = current.sound[mode];

    // A stored slot is only a safe merge base when it's the SAME pick as the
    // live entry — otherwise (no stored slot, OR a stale one left over from
    // before "Change" swapped in a different song/film) it must be ignored
    // entirely, or favouriting would read/write the WRONG entry's data. This
    // is the exact bug Change → pick something else → star it used to hit.
    const matchesStored = !!storedSlot && isSameTrack(storedSlot, entry);

    // Re-check the link against the real list right before acting — it may
    // have been deleted in the Favourites tab a moment ago (the subscription
    // above should already have caught that, but this is the direct guard a
    // tap always goes through). A star whose favourite is already gone must
    // create a new one, never try to remove something that isn't there.
    const favouriteStillExists = entry.favouriteId
      ? (await loadFavourites()).some((f) => f.id === entry.favouriteId)
      : false;

    if (entry.favouriteId && favouriteStillExists) {
      const favId = entry.favouriteId;
      setEntries((prev) => {
        const cur = prev[mode];
        return cur ? { ...prev, [mode]: { ...cur, favouriteId: null } } : prev;
      });
      await removeFavourite(favId);
      // Only the link changes when storedSlot really is this track — never
      // merge into a mismatched stored slot.
      const base = matchesStored ? storedSlot! : entry;
      await saveDayEntry(dateKey, { sound: { [mode]: { ...base, favouriteId: null } } });
    } else {
      if (entry.favouriteId && !favouriteStillExists) {
        // clear the stale link before adding a fresh one
        setEntries((prev) => {
          const cur = prev[mode];
          return cur ? { ...prev, [mode]: { ...cur, favouriteId: null } } : prev;
        });
      }
      // The favourite's own name/rating/note/etc. ALWAYS come from the live
      // `entry` — that's what's visibly selected and being starred, never a
      // stored slot, even a matching one (lib/favouritesStore.ts's own
      // dedupe-and-reuse handles the "rating/note went stale" case safely).
      const source = entry;
      const displayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const fav = await addFavourite({
        category: FAVOURITE_CATEGORY_BY_MEDIA[source.mediaType],
        name: source.title,
        rating: source.rating,
        note: source.note,
        photoUri: source.artworkUrl || '',
        dateKey,
        displayDate,
      });
      setEntries((prev) => {
        const cur = prev[mode];
        return cur ? { ...prev, [mode]: { ...cur, favouriteId: fav.id } } : prev;
      });
      // EDGE CASE, as asked: if there's no matching stored slot (never saved,
      // OR stale/from a different pick), save the WHOLE live entry, link
      // included — not just the link — so the favourite points at a title
      // that actually exists in the day record. If storedSlot DOES match,
      // only the link changes; rating/note/etc. stay exactly as last saved,
      // matching "don't save the rest of the unsaved edits".
      const baseForSave = matchesStored ? storedSlot! : entry;
      await saveDayEntry(dateKey, { sound: { [mode]: { ...baseForSave, favouriteId: fav.id } } });
    }
  };

  // Rating is live, unsaved state until Done — syncing it to the favourite on
  // every tap would be the same orphan-bug class as toggleFavourite just
  // fixed (chevron discards this, Favourites wouldn't know). The favourite's
  // rating/note are kept in sync in handleDone instead, at the one point this
  // is actually saved.
  const tapRating = (n: number) => {
    setEntries((prev) => {
      const cur = prev[mode];
      return cur ? { ...prev, [mode]: { ...cur, rating: n } } : prev;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const s = pillScales[n - 1];
    Animated.sequence([
      Animated.spring(s, { toValue: 1.15, useNativeDriver: true, speed: 50, bounciness: 14 }),
      Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
    ]).start();
  };

  const handleDone = async () => {
    if (anyFilled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // both slots together — they're independent, but saving one alone would
    // read as "the other was cleared"
    saveDayEntry(formatDateKey(new Date()), {
      sound: { listen: entries.listen, watch: entries.watch },
    });
    // This is the one point rating/note actually become saved (chevron
    // discards them) — so it's also the point any favourited slot's
    // Favourites-list row gets brought in line with what was just saved.
    // AWAITED (handleDone is now async) so dismiss() can't fire — and the
    // user navigate to the Favourites tab — before these writes actually
    // land; lib/favouritesStore.ts also now queues them so the two can't
    // race each other regardless.
    for (const m of ['listen', 'watch'] as const) {
      const e = entries[m];
      if (e?.favouriteId) {
        await updateFavouriteNote(e.favouriteId, e.note);
        await updateFavouriteRating(e.favouriteId, e.rating);
      }
    }
    dismiss();
  };

  // The rating row must never need a scroll. Artwork is the only elastic part of
  // the hero, so it takes whatever height is left after everything else (title,
  // subtitle, Change, rating label + row) and no more. Measured only while the
  // keyboard is down, so typing a note doesn't shrink the artwork under you.
  const isFilm = entry?.mediaType === 'film';
  const maxArtH = isFilm ? 255 : 170;
  const artH = heroH > 0 ? Math.max(96, Math.min(maxArtH, heroH - HERO_FIXED)) : 140;
  const artworkStyle = isFilm
    ? { width: Math.round((artH * 2) / 3), height: artH }
    : { width: artH, height: artH };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            marginBottom: keyboardHeight,
            paddingBottom: keyboardUp ? 12 : insets.bottom + 12,
          },
        ]}
      >
        <Pressable style={styles.sheetInner} onPress={Keyboard.dismiss} accessible={false}>
        {/* grabber */}
        <View style={styles.grabber} />

        {/* top row */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); dismiss(); }} hitSlop={10}>
            <Ionicons name="chevron-down" size={24} color={W60} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); handleDone(); }} hitSlop={10}>
            <Text style={styles.topDone}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* title (cross-fades on mode change) */}
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
          {TITLE_BY_MODE[displayMode]}
        </Animated.Text>

        {/* mode toggle */}
        <View style={styles.toggle}>
          {SEGMENTS.map((seg) => {
            const selected = seg.mode === mode;
            return (
              <TouchableOpacity
                key={seg.mode}
                activeOpacity={0.85}
                onPress={() => switchMode(seg.mode)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Ionicons name={seg.icon} size={18} color={selected ? palette.textPrimary : W50} />
                <Text style={[styles.segmentLabel, { color: selected ? palette.textPrimary : W50 }]}>
                  {seg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* MIDDLE — fills the fixed sheet height; footer stays pinned below it */}
        <View style={styles.middle}>
          {/* SEARCH STATE */}
          {!entry && (
          <>
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={18} color={palette.textMuted} />
              <TextInput
                inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={PLACEHOLDER_BY_MODE[mode]}
                placeholderTextColor={palette.textMuted}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            {error ? (
              <Text style={styles.errorLine}>Couldn&apos;t search right now</Text>
            ) : !query.trim() && results.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name={SEGMENTS.find((s) => s.mode === mode)!.icon}
                  size={32}
                  color={palette.ringSubtle}
                />
                <Text style={styles.emptyText}>{EMPTY_BY_MODE[mode]}</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.results}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {results.map((r, i) => (
                  <AnimatedCard
                    key={`${r.externalId}-${i}`}
                    onPress={() => selectResult(r)}
                    style={[styles.resultRow, i < results.length - 1 && styles.resultDivider]}
                  >
                    <View style={styles.resultInner}>
                      <View style={[styles.thumb, { backgroundColor: INPUT_BG }]}>
                        {r.artworkUrl ? (
                          <Animated.Image source={{ uri: r.artworkUrl }} style={styles.thumbImg} />
                        ) : (
                          <View style={styles.noArt}>
                            <Ionicons name="film-outline" size={20} color={palette.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.resultText}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {r.title}
                        </Text>
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                          {r.subtitle ? `${r.subtitle} · ` : ''}
                          <Text style={styles.resultType}>{TYPE_LABEL[r.mediaType]}</Text>
                        </Text>
                      </View>
                    </View>
                  </AnimatedCard>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* HERO STATE */}
        {entry && (
          <Animated.View
            onLayout={(e) => {
              if (!keyboardUp) setHeroH(e.nativeEvent.layout.height);
            }}
            style={[
              styles.heroWrap,
              {
                opacity: heroAnim,
                transform: [{ scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <ScrollView
              ref={heroScrollRef}
              onLayout={(e) => {
                heroViewH.current = e.nativeEvent.layout.height;
              }}
              onContentSizeChange={(_, h) => {
                heroContentH.current = h;
              }}
              style={styles.heroScroll}
              contentContainerStyle={styles.heroContent}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* artwork + ambient glow (same two-gradient approach as SlideSound) */}
              <View style={styles.artworkWrap}>
                <LinearGradient
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  locations={[0, 0.42, 1]}
                  colors={[w.surface, withAlpha(w.accent, 0.3), w.surface]}
                />
                <LinearGradient
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  locations={[0, 0.5, 1]}
                  colors={[w.surface, 'transparent', w.surface]}
                />
                <View style={[styles.artwork, artworkStyle, { shadowColor: w.accent }]}>
                  {entry.artworkUrl ? (
                    <Animated.Image source={{ uri: entry.artworkUrl }} style={styles.artworkImg} />
                  ) : (
                    <View style={styles.noArt}>
                      <Ionicons name="film-outline" size={40} color={palette.textMuted} />
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {entry.title}
              </Text>
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {entry.subtitle}
              </Text>
              <View style={styles.changeRow}>
                <TouchableOpacity onPress={changeSelection} hitSlop={10}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFavourite} hitSlop={10} style={styles.starBtn}>
                  <Ionicons
                    name={entry.favouriteId ? 'star' : 'star-outline'}
                    size={18}
                    color={entry.favouriteId ? palette.favouriteStar : W50}
                  />
                </TouchableOpacity>
              </View>

              {/* rating */}
              <Text style={styles.fieldLabel}>How would you rate it?</Text>
              <View style={styles.ratingRow}>
                {Array.from({ length: 10 }, (_, i) => {
                  const n = i + 1;
                  const filled = entry.rating >= n;
                  return (
                    <Pressable key={n} onPress={() => tapRating(n)} hitSlop={6}>
                      <Animated.View
                        style={[
                          styles.pill,
                          filled
                            ? { backgroundColor: w.accent }
                            : { borderWidth: 1, borderColor: palette.ringSubtle },
                          { transform: [{ scale: pillScales[i] }] },
                        ]}
                      >
                        <Text style={[styles.pillNum, { color: filled ? palette.textPrimary : palette.textMuted }]}>
                          {n}
                        </Text>
                      </Animated.View>
                    </Pressable>
                  );
                })}
              </View>

              {/* note */}
              <Text style={[styles.fieldLabel, styles.reactionLabel]}>Add a note</Text>
              <View
                style={styles.reactionBox}
                onLayout={(e) => {
                  noteY.current = e.nativeEvent.layout.y;
                }}
              >
                <TextInput
                  inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                  style={styles.reactionInput}
                  value={entry.note}
                  onChangeText={(txt) =>
                    setEntries((prev) => {
                      const cur = prev[mode];
                      return cur ? { ...prev, [mode]: { ...cur, note: txt } } : prev;
                    })
                  }
                  placeholder={NOTE_PLACEHOLDER[entry.mediaType]}
                  placeholderTextColor={palette.textMuted}
                  onFocus={onNoteFocus}
                  onBlur={onNoteBlur}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          </Animated.View>
        )}

        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <EditorFooterProgress
            note={bothFilled ? 'Both join your sound history' : 'This joins your sound history'}
            completed={completed}
            accent={w.accent}
            fontFamily={w.fontRegular}
            collapsed={keyboardUp}
          />
        </View>
        </Pressable>
      </View>
      <KeyboardDismissBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: w.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },

  sheet: {
    // height is set per-render — it shrinks to sit above the keyboard
    backgroundColor: w.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetInner: { flex: 1 },
  middle: { flex: 1 }, // fills the space between the fixed chrome and the pinned footer

  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: W20,
    alignSelf: 'center',
    marginTop: space.sm, // 8
  },

  topRow: {
    marginTop: space.base, // 16
    paddingHorizontal: space.xl, // 24
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topDone: { fontFamily: w.fontMedium, fontSize: type.body.fontSize, color: w.accent },

  title: {
    marginTop: space.lg, // 20
    paddingHorizontal: space.xl,
    textAlign: 'left',
    fontFamily: w.fontMedium,
    fontSize: 22,
    color: palette.textPrimary,
  },

  // toggle
  toggle: {
    marginTop: space.lg,
    marginHorizontal: space.xl,
    height: 44,
    borderRadius: 22,
    backgroundColor: INPUT_BG,
    flexDirection: 'row',
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: { backgroundColor: w.accent },
  segmentLabel: { fontFamily: w.fontRegular, fontSize: 14, marginLeft: 6 },

  // search
  searchField: {
    marginTop: space.lg,
    marginHorizontal: space.xl,
    height: 48,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  // NO vertical padding here. On iOS a single-line TextInput applies padding to the
  // typed text and cursor but NOT to the placeholder, so any asymmetric padding
  // splits them apart. Stretching to the 48pt field lets UITextField centre the
  // placeholder, text and cursor together, all on the same line box.
  searchInput: {
    flex: 1,
    alignSelf: 'stretch',
    marginLeft: 10,
    padding: 0,
    fontFamily: w.fontRegular,
    fontSize: type.body.fontSize,
    color: palette.textPrimary,
  },
  errorLine: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    fontFamily: w.fontRegular,
    fontSize: type.label.fontSize,
    color: W50,
  },

  results: { flex: 1, marginTop: space.sm },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: space.md, fontFamily: w.fontRegular, fontSize: 14, color: W30, textAlign: 'center' },
  resultRow: { height: 64, paddingHorizontal: space.xl },
  resultDivider: { borderBottomWidth: 1, borderBottomColor: palette.hairline },
  resultInner: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  thumbImg: { width: 44, height: 44 },
  noArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, marginLeft: 14 },
  resultTitle: { fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },
  resultSubtitle: { fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: W50, marginTop: 2 },
  resultType: { fontSize: 11, color: palette.textMuted },

  // hero
  heroWrap: { flex: 1 },
  heroScroll: { flex: 1 },
  heroContent: { paddingBottom: space.lg }, // room below the note so it can scroll clear of the keyboard
  artworkWrap: {
    marginTop: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
  },
  artwork: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: INPUT_BG,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  artworkImg: { width: '100%', height: '100%' },
  heroTitle: {
    marginTop: 14,
    paddingHorizontal: space.xl,
    textAlign: 'center',
    fontFamily: w.fontMedium,
    fontSize: type.headline.fontSize,
    color: palette.textPrimary,
  },
  heroSubtitle: {
    marginTop: 2,
    paddingHorizontal: space.xl,
    textAlign: 'center',
    fontFamily: w.fontRegular,
    fontSize: 14,
    color: W60,
  },
  changeRow: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  starBtn: { marginLeft: space.base },
  changeLink: { fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: w.accent },

  // rating
  fieldLabel: {
    marginTop: 22,
    paddingHorizontal: space.xl,
    fontFamily: w.fontRegular,
    fontSize: 14,
    color: W50,
  },
  ratingRow: {
    marginTop: 10,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillNum: { fontFamily: w.fontRegular, fontSize: type.label.fontSize },

  // reaction
  reactionLabel: { marginTop: space.lg },
  // The INPUT is the whole box: it has a real height and carries the padding, so
  // a tap anywhere inside the box lands on the TextInput (a flex:1 input in a
  // box with only min/max height collapsed to one line, leaving the rest dead).
  reactionBox: {
    marginTop: space.sm,
    marginHorizontal: space.xl,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reactionInput: {
    height: NOTE_BOX_H,
    padding: 14,
    fontFamily: w.fontRegular,
    fontSize: type.body.fontSize,
    color: palette.textPrimary,
  },

  // footer
  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline, marginTop: space.lg },
});
