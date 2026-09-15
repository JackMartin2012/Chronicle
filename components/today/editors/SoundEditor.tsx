import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
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
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';
import { countFilledInputs, formatDateKey, loadDayEntry, saveDayEntry } from '@/lib/dayEntry';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.78); // fixed sheet height — stable across search/hero states

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W50 = 'rgba(255,255,255,0.5)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const INPUT_BG = '#16233d';
const BACKDROP = 'rgba(0,0,0,0.55)';

// same rgba-from-hex helper SlideSound uses for its glow
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
};

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
const REQUESTS: Record<SoundMode, { mediaType: MediaType; url: (q: string) => string }[]> = {
  listen: [
    { mediaType: 'song', url: (q) => `${ITUNES}?term=${q}&media=music&entity=song&limit=8` },
    { mediaType: 'podcast', url: (q) => `${ITUNES}?term=${q}&media=podcast&limit=6` },
  ],
  watch: [
    { mediaType: 'film', url: (q) => `${ITUNES}?term=${q}&media=movie&limit=8` },
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

  // Seed from today's record so reopening shows both slots as you left them,
  // and lands on whichever side you actually filled.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      setEntries({ listen: day.sound.listen, watch: day.sound.watch });
      if (!day.sound.listen && day.sound.watch) {
        setMode('watch');
        setDisplayMode('watch');
      }
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);

  const entry = entries[mode]; // the current mode's slot
  const anyFilled = !!entries.listen || !!entries.watch;
  const bothFilled = !!entries.listen && !!entries.watch;

  const titleOpacity = useRef(new Animated.Value(1)).current;
  const heroAnim = useRef(new Animated.Value(0)).current; // 0 → 1: hero scale-in + fade
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
              items: (json.results || [])
                .map((r: any) => mapResult(r, req.mediaType))
                .filter((x: SoundEntry) => x.title && x.artworkUrl),
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
    setEntries((prev) => ({ ...prev, [mode]: null })); // keeps the previous query → search re-runs
  };

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

  const handleDone = () => {
    if (anyFilled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // both slots together — they're independent, but saving one alone would
    // read as "the other was cleared"
    saveDayEntry(formatDateKey(new Date()), {
      sound: { listen: entries.listen, watch: entries.watch },
    });
    dismiss();
  };

  const artworkStyle =
    entry?.mediaType === 'film' ? { width: 170, height: 255 } : { width: 170, height: 170 };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
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
                        ) : null}
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
            style={[
              styles.heroWrap,
              {
                opacity: heroAnim,
                transform: [{ scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <ScrollView
              style={styles.heroScroll}
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
                  ) : null}
                </View>
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {entry.title}
              </Text>
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {entry.subtitle}
              </Text>
              <TouchableOpacity onPress={changeSelection} hitSlop={10} style={styles.changeWrap}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>

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
              <View style={styles.reactionBox}>
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
          <Text style={styles.footerNote}>
            {bothFilled ? 'Both join your sound history' : 'This joins your sound history'}
          </Text>
          {/* the progress row the shared chrome specifies — this editor was
              the only one of the eight missing it */}
          <View style={styles.progressRow}>
            {Array.from({ length: 8 }, (_, i) => (
              <View
                key={i}
                style={[styles.progressDot, { backgroundColor: i < completed ? w.accent : palette.ringSubtle }]}
              />
            ))}
            <Text style={styles.progressText}>{completed} of 8 filled in today</Text>
          </View>
          <TouchableOpacity
            activeOpacity={anyFilled ? 0.85 : 1}
            onPress={anyFilled ? handleDone : undefined}
            style={[styles.doneButton, { backgroundColor: anyFilled ? w.accent : palette.hairline }]}
          >
            <Text style={[styles.doneButtonText, { color: anyFilled ? palette.textPrimary : W30 }]}>Done</Text>
          </TouchableOpacity>
        </View>
        </Pressable>
      </View>
      <KeyboardDismissBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: w.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },

  sheet: {
    height: SHEET_HEIGHT,
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
  searchInput: {
    flex: 1,
    marginLeft: 10,
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
  resultText: { flex: 1, marginLeft: 14 },
  resultTitle: { fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },
  resultSubtitle: { fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: W50, marginTop: 2 },
  resultType: { fontSize: 11, color: palette.textMuted },

  // hero
  heroWrap: { flex: 1 },
  heroScroll: { flex: 1 },
  artworkWrap: {
    marginTop: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
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
  changeWrap: { marginTop: space.sm, alignSelf: 'center' },
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
  reactionBox: {
    marginTop: space.sm,
    marginHorizontal: space.xl,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    padding: 14,
    minHeight: 88,
    maxHeight: 88,
  },
  reactionInput: {
    flex: 1,
    fontFamily: w.fontRegular,
    fontSize: type.body.fontSize,
    color: palette.textPrimary,
  },

  // footer
  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline, marginTop: space.lg },
  progressRow: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  progressText: { marginLeft: 4, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: palette.textMuted },
  footerNote: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: w.fontRegular,
    fontSize: type.label.fontSize,
    color: palette.textMuted,
  },
  doneButton: {
    marginTop: space.md, // 12
    marginHorizontal: space.xl,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: { fontFamily: w.fontMedium, fontSize: type.body.fontSize },
});
