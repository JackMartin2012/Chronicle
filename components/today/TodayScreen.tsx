import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';

import {
  dim,
  getWorld,
  motion,
  palette,
  radius,
  space,
  type,
} from '@/constants/chronicleTheme';
import ThreeWordsEditor from '@/components/today/ThreeWordsEditor';
import CameraRollEditor from '@/components/today/editors/CameraRollEditor';
import CaptureEditor from '@/components/today/editors/CaptureEditor';
import FutureNoteEditor from '@/components/today/editors/FutureNoteEditor';
import LearnedEditor from '@/components/today/editors/LearnedEditor';
import PeopleEditor from '@/components/today/editors/PeopleEditor';
import PlacesEditor from '@/components/today/editors/PlacesEditor';
import SoundEditor from '@/components/today/editors/SoundEditor';
import StoryEditor from '@/components/today/editors/StoryEditor';
import { countFilledInputs, emptyDayEntry, formatDateKey, loadDayEntry, TOTAL_INPUTS } from '@/lib/dayEntry';
import type { DayEntry, SoundEntry, SoundSlots } from '@/lib/types';

type EditorKey =
  | 'capture'
  | 'cameraRoll'
  | 'threeWords'
  | 'story'
  | 'sound'
  | 'people'
  | 'places'
  | 'learned'
  | 'futureNote';

// Present-world tokens are used throughout this presentation-only screen.
const w = getWorld('present');

const { height: SCREEN_H } = Dimensions.get('window');
const CAPTURE_HEIGHT = Math.round(SCREEN_H * 0.22);
const ALBUM_ART_SIZE = 96; // fixed square — must not stretch to fill the tile

// Fallback fill for a photo slot that has nothing saved yet — not a theme
// colour, just a neutral surface behind an icon.
const PLACEHOLDER_BLOCK = '#3a3f4a';

// Purely decorative — indicates "a voice note exists", not real audio data.
// The record only stores duration, never a waveform.
const WAVE = [6, 12, 18, 9, 14, 20, 8, 11, 16, 10, 7, 15, 19, 12, 9, 13, 17, 8, 14, 11];

// Oxford-style join: "Alex" / "Alex & Sam" / "Alex, Sam & Mum"
const joinNames = (names: string[]): string => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
};

// ---------------------------------------------------------------------------
// PROGRESS RING
// ---------------------------------------------------------------------------

const RING_SIZE = 52;
const RING_STROKE = 4;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ProgressRing({ done, total }: { done: number; total: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const prevDone = useRef<number | null>(null);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: total > 0 ? done / total : 0,
      useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();

    if (prevDone.current !== null && prevDone.current !== done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevDone.current = done;
  }, [done, total, progress]);

  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [RING_CIRC, 0] });

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* thin track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          stroke={palette.ringSubtle}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* blue progress arc, starting at 12 o'clock */}
        <G rotation={-90} origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke={w.accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.ringLabel} pointerEvents="none">
        <Text style={styles.ringText}>
          {done}/{total}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PRESSABLE TILE — spring scale on press, no-op onPress
// ---------------------------------------------------------------------------

type TileHandlers = { onPress: () => void; onPressIn: () => void; onPressOut: () => void };

// `plain` tiles have NO Pressable around their content: the content gets the
// press handlers and wires them up itself. A tile that contains its own
// horizontal scroller needs this — a Pressable ancestor becomes the touch
// responder first and the scroller underneath never gets to pan.
function PressableTile({
  children,
  style,
  innerStyle,
  padded = true,
  onPress,
  plain = false,
}: {
  children: React.ReactNode | ((handlers: TileHandlers) => React.ReactNode);
  style?: object;
  innerStyle?: object;
  padded?: boolean;
  onPress?: () => void;
  plain?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: motion.pressScale,
      useNativeDriver: true,
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();

  const handlers: TileHandlers = { onPress: onPress ?? (() => {}), onPressIn: pressIn, onPressOut: pressOut };

  if (plain) {
    return (
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        <View style={[styles.tile, padded && styles.tilePadded, innerStyle]}>
          {typeof children === 'function' ? children(handlers) : children}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        onPress={handlers.onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.tile, padded && styles.tilePadded, innerStyle]}
      >
        {typeof children === 'function' ? children(handlers) : children}
      </Pressable>
    </Animated.View>
  );
}

// Muted top-left heading shared by every tile.
function TileHeading({ children }: { children: string }) {
  return <Text style={styles.tileHeading}>{children}</Text>;
}

// Shared empty-state body: thin-line icon + short prompt, centred.
function EmptyBody({ icon, prompt }: { icon: keyof typeof Ionicons.glyphMap; prompt: string }) {
  return (
    <View style={styles.emptyBody}>
      <Ionicons name={icon} size={24} color={palette.textMuted} />
      <Text style={styles.emptyPrompt}>{prompt}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SOUND TILE — one slot shows plain; both slots swipe (paging, like the day card)
// ---------------------------------------------------------------------------

function SoundSlide({ entry, heading }: { entry: SoundEntry; heading: string }) {
  return (
    <View>
      <TileHeading>{heading}</TileHeading>
      {entry.artworkUrl ? (
        <Image source={{ uri: entry.artworkUrl }} style={styles.albumArt} />
      ) : (
        <View style={[styles.albumArt, styles.albumArtEmpty]}>
          <Ionicons
            name={entry.mode === 'watch' ? 'film-outline' : 'musical-notes-outline'}
            size={28}
            color={palette.textMuted}
          />
        </View>
      )}
      <View style={styles.trackRow}>
        <Ionicons name="play" size={14} color={w.accent} />
        <Text style={styles.trackName} numberOfLines={1}>
          {entry.title}
        </Text>
      </View>
    </View>
  );
}

function SoundTileBody({ sound, press }: { sound: SoundSlots; press: TileHandlers }) {
  const slides = [
    sound.listen && { entry: sound.listen, heading: 'Listening to' },
    sound.watch && { entry: sound.watch, heading: 'Watching' },
  ].filter((x): x is { entry: SoundEntry; heading: string } => !!x);

  const [pageW, setPageW] = useState(0);
  const [page, setPage] = useState(0);

  if (slides.length === 0) {
    return (
      <Pressable {...press} style={styles.soundFill}>
        <TileHeading>Listening to</TileHeading>
        <EmptyBody icon="headset-outline" prompt="What did you listen to or watch?" />
      </Pressable>
    );
  }
  if (slides.length === 1) {
    return (
      <Pressable {...press} style={styles.soundFill}>
        <SoundSlide {...slides[0]} />
      </Pressable>
    );
  }

  return (
    <View style={styles.soundFill} onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
      {pageW > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          bounces={false}
          style={styles.soundFill}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
        >
          {slides.map((sl) => (
            <Pressable key={sl.heading} {...press} style={{ width: pageW }}>
              <SoundSlide {...sl} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Pressable {...press} style={styles.soundFill}>
          <SoundSlide {...slides[0]} />
        </Pressable>
      )}
      <View style={styles.soundDots} pointerEvents="none">
        {slides.map((sl, i) => (
          <View key={sl.heading} style={[styles.soundDot, i === page && styles.soundDotActive]} />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SCREEN
// ---------------------------------------------------------------------------

// `embedded`: rendered inside another screen that already owns the top of the
// page (the Your Present tab's header + tab switcher). Drops this screen's own
// safe-area padding and top bar (weekday/date/ring) so nothing is duplicated.
export default function TodayScreen({ embedded = false }: { embedded?: boolean }) {
  const insets = useSafeAreaInsets();
  const dateKey = formatDateKey(new Date());

  const [day, setDay] = useState<DayEntry>(() => emptyDayEntry(dateKey));
  const [activeEditor, setActiveEditor] = useState<EditorKey | null>(null);

  const reload = useCallback(() => {
    let active = true;
    loadDayEntry(dateKey).then((loaded) => {
      if (active) setDay(loaded);
    });
    return () => {
      active = false;
    };
  }, [dateKey]);

  // Reload every time the screen regains focus — coming back from an editor
  // should always show what was just saved, not a stale mount-time snapshot.
  useFocusEffect(useCallback(() => reload(), [reload]));

  // The editor's own chevron vs Done already decide whether anything gets
  // saved — chevron just calls onClose, Done calls saveDayEntry then onClose.
  // Closing here never saves anything itself; it only re-reads storage, so a
  // chevron-dismiss mid-edit shows whatever was already there (nothing lost,
  // nothing incomplete written), while a Done-dismiss shows the fresh save.
  const closeEditor = useCallback(() => {
    setActiveEditor(null);
    reload();
  }, [reload]);

  const now = new Date();
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateLine = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  const done = countFilledInputs(day);

  // ---- CAPTURE ----
  const capturePhotos: Record<'main' | 'selfie', string | null> = {
    main: day.capture.mainPhotoUri || null,
    selfie: day.capture.selfieUri || null,
  };
  const bigSlot: 'main' | 'selfie' = day.capture.selfieIsBig ? 'selfie' : 'main';
  const insetSlot: 'main' | 'selfie' = bigSlot === 'selfie' ? 'main' : 'selfie';
  const hasCapture = capturePhotos.main !== null || capturePhotos.selfie !== null;

  // ---- THREE WORDS ----
  const threeWordsList = day.threeWords.words.map((word) => word.word.trim()).filter(Boolean);
  const hasThreeWords = threeWordsList.length > 0 || day.threeWords.mood !== '';

  // ---- YOUR DAY ----
  const hasStory = day.story.text.trim() !== '' || day.story.voiceNoteUri !== '';

  // ---- PEOPLE ----
  const peopleLine = joinNames(day.people.map((p) => p.name));

  // ---- PLACES — merged tags don't render their own pill ----
  const placePills = day.places.filter((p) => !p.mergedIntoId);

  return (
    <SafeAreaView style={styles.root} edges={embedded ? [] : ['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          // bottom padding clears the tab bar + home indicator
          { paddingBottom: insets.bottom + space.xxxl + space.section },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP BAR */}
        {!embedded && (
          <View style={styles.topBar}>
            <View>
              <Text style={styles.topWeekday}>{weekday}</Text>
              <Text style={styles.topDate}>{dateLine}</Text>
            </View>
            <ProgressRing done={done} total={TOTAL_INPUTS} />
          </View>
        )}

        {/* 1 — TODAY'S CAPTURE */}
        <PressableTile
          innerStyle={{ height: CAPTURE_HEIGHT }}
          padded={false}
          onPress={() => setActiveEditor('capture')}
        >
          {hasCapture ? (
            <>
              {capturePhotos[bigSlot] ? (
                <Image
                  source={{ uri: capturePhotos[bigSlot]! }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.capturePhotoFallback]} />
              )}

              {capturePhotos[insetSlot] && (
                <Image source={{ uri: capturePhotos[insetSlot]! }} style={styles.selfieInset} />
              )}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.65)']}
                style={styles.captureGradient}
              >
                <Text style={styles.captureHeading}>Today&apos;s capture</Text>
              </LinearGradient>
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.capturePhotoFallback, styles.captureEmptyFill]}>
              <EmptyBody icon="camera-outline" prompt="Capture today" />
            </View>
          )}
        </PressableTile>

        {/* 1b — TODAY'S PHOTOS & VIDEOS. Not one of the eight inputs: it never
            counts toward the progress ring (countFilledInputs is untouched). */}
        <PressableTile onPress={() => setActiveEditor('cameraRoll')}>
          <View style={styles.cameraRollRow}>
            <Ionicons name="images-outline" size={20} color={w.accent} />
            <Text style={styles.cameraRollLabel}>Today&apos;s photos &amp; videos</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
          </View>
        </PressableTile>

        {/* 2 — THREE WORDS */}
        <PressableTile onPress={() => setActiveEditor('threeWords')}>
          <TileHeading>Today in three words</TileHeading>
          {hasThreeWords ? (
            <Text style={styles.threeWords}>
              {threeWordsList.join(' · ')}
              {day.threeWords.mood ? ` ${day.threeWords.mood}` : ''}
            </Text>
          ) : (
            <EmptyBody icon="text-outline" prompt="Sum up your day in three words" />
          )}
        </PressableTile>

        {/* 3 — YOUR DAY */}
        <PressableTile onPress={() => setActiveEditor('story')}>
          <TileHeading>Your day</TileHeading>
          {hasStory ? (
            <>
              {day.story.text.trim() !== '' && (
                <>
                  <Text style={styles.dayBody} numberOfLines={3}>
                    {day.story.text.trim()}
                  </Text>
                  <Text style={styles.moreLink}>more</Text>
                </>
              )}
              {day.story.voiceNoteUri !== '' && (
                <View style={styles.waveform}>
                  {WAVE.map((h, i) => (
                    <View key={i} style={[styles.waveBar, { height: h }]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <EmptyBody icon="book-outline" prompt="Write or record your day" />
          )}
        </PressableTile>

        {/* 4 & 5 — LISTENING TO (OR WATCHING) / WITH PEOPLE */}
        <View style={styles.halfRow}>
          <PressableTile
            style={styles.halfTile}
            innerStyle={styles.halfTileInner}
            onPress={() => setActiveEditor('sound')}
            plain
          >
            {(press) => <SoundTileBody sound={day.sound} press={press} />}
          </PressableTile>

          <PressableTile
            style={styles.halfTile}
            innerStyle={styles.halfTileInner}
            onPress={() => setActiveEditor('people')}
          >
            <TileHeading>With people</TileHeading>
            {day.people.length > 0 ? (
              <>
                <View style={styles.facesRow}>
                  {day.people.slice(0, 3).map((person, i) =>
                    person.photoUri ? (
                      <Image
                        key={person.id}
                        source={{ uri: person.photoUri }}
                        style={[styles.faceCircle, i > 0 && styles.faceOverlap]}
                      />
                    ) : (
                      <View key={person.id} style={[styles.faceCircle, i > 0 && styles.faceOverlap]} />
                    )
                  )}
                </View>
                <Text style={styles.peopleLine} numberOfLines={1}>
                  {peopleLine}
                </Text>
              </>
            ) : (
              <EmptyBody icon="people-outline" prompt="Who were you with?" />
            )}
          </PressableTile>
        </View>

        {/* 6 & 7 — SOMETHING YOU LEARNED / PLACES */}
        <View style={styles.halfRow}>
          <PressableTile style={styles.halfTile} onPress={() => setActiveEditor('learned')}>
            <TileHeading>Something you learned</TileHeading>
            {day.learned.trim() !== '' ? (
              <Text style={styles.dayBody} numberOfLines={4}>
                {day.learned.trim()}
              </Text>
            ) : (
              <EmptyBody icon="bulb-outline" prompt="Add something you learned" />
            )}
          </PressableTile>

          <PressableTile style={styles.halfTile} onPress={() => setActiveEditor('places')}>
            <TileHeading>Places</TileHeading>
            {placePills.length > 0 ? (
              <View style={styles.placePillsRow}>
                {placePills.map((place) => (
                  <View key={place.id} style={styles.placePill}>
                    <Text style={styles.placePillText} numberOfLines={1}>
                      {place.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyBody icon="location-outline" prompt="Where did today take you?" />
            )}
          </PressableTile>
        </View>

        {/* 8 — FOR FUTURE YOU */}
        <PressableTile onPress={() => setActiveEditor('futureNote')}>
          <TileHeading>For future you</TileHeading>
          {day.futureNote.note.trim() !== '' ? (
            <View style={styles.futureRow}>
              <Ionicons name="mail-outline" size={20} color={palette.textMuted} />
              <Text style={styles.futureNoteText} numberOfLines={2}>
                {day.futureNote.note.trim()}
              </Text>
            </View>
          ) : (
            <View style={styles.futureRow}>
              <Ionicons name="mail-outline" size={20} color={palette.textMuted} />
              <Text style={styles.futurePrompt}>Leave a note for future you</Text>
            </View>
          )}
        </PressableTile>

        {/* BOTTOM — SEE TODAY AS A DAY CARD */}
        <Pressable style={styles.dayCardButton} onPress={() => {}}>
          <Text style={styles.dayCardButtonText}>See today as a day card</Text>
        </Pressable>
      </ScrollView>

      {/* EDITOR SHEET — nested here, not pushed as a route (rule 5: never
          stack independent modals). Only mounted while an editor is open, so
          each open is a fresh mount and its own seed-from-storage effect runs
          again rather than showing stale state from the last time it opened. */}
      {activeEditor && (
        <Modal visible transparent animationType="slide" onRequestClose={closeEditor}>
          {activeEditor === 'capture' && <CaptureEditor onClose={closeEditor} />}
          {activeEditor === 'cameraRoll' && <CameraRollEditor onClose={closeEditor} />}
          {activeEditor === 'threeWords' && <ThreeWordsEditor world="present" onClose={closeEditor} />}
          {activeEditor === 'story' && <StoryEditor onClose={closeEditor} />}
          {activeEditor === 'sound' && <SoundEditor onClose={closeEditor} />}
          {activeEditor === 'people' && <PeopleEditor onClose={closeEditor} />}
          {activeEditor === 'places' && <PlacesEditor onClose={closeEditor} />}
          {activeEditor === 'learned' && <LearnedEditor onClose={closeEditor} />}
          {activeEditor === 'futureNote' && <FutureNoteEditor onClose={closeEditor} />}
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: w.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: space.screenX },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  topWeekday: { ...type.label, fontFamily: w.fontRegular, color: palette.textSecondary },
  topDate: { ...type.title, fontFamily: w.fontBold, color: palette.textPrimary, marginTop: 2 },

  // RING
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringText: { ...type.caption, fontFamily: w.fontMedium, color: palette.textPrimary },

  // TILE BASE
  tile: {
    backgroundColor: w.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: space.md,
    overflow: 'hidden',
  },
  tilePadded: { padding: space.base },
  tileHeading: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: palette.textMuted,
  },

  // 1b — CAMERA ROLL LINK
  cameraRollRow: { flexDirection: 'row', alignItems: 'center' },
  cameraRollLabel: { flex: 1, marginLeft: space.md, fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },

  // 1 — CAPTURE
  capturePhotoFallback: { backgroundColor: w.surface },
  captureEmptyFill: { alignItems: 'center', justifyContent: 'center' },
  selfieInset: {
    position: 'absolute',
    top: space.base,
    left: space.base,
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
    backgroundColor: PLACEHOLDER_BLOCK,
  },
  captureGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.base,
    paddingTop: space.xl,
    paddingBottom: space.base,
  },
  captureHeading: { ...type.caption, fontFamily: w.fontRegular, color: palette.textPrimary },

  // 2 — THREE WORDS
  threeWords: {
    ...type.headline,
    fontFamily: w.fontBold,
    color: palette.textPrimary,
    marginTop: space.sm,
  },

  // 3 — YOUR DAY
  dayBody: {
    ...type.body,
    fontFamily: w.fontRegular,
    color: palette.textPrimary,
    opacity: 0.85,
    marginTop: space.sm,
  },
  moreLink: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: w.accent,
    opacity: dim.resting,
    marginTop: space.xs,
  },
  waveform: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space.md, height: 20 },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: palette.textMuted,
    marginRight: 3,
  },

  // HALF-WIDTH ROWS
  halfRow: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  halfTile: { flex: 1 },
  halfTileInner: { flex: 1 }, // fill the row's stretched height so both tiles match

  // 4 — LISTENING TO / WATCHING
  albumArt: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: radius.md,
    marginTop: space.sm,
    backgroundColor: PLACEHOLDER_BLOCK,
  },
  soundFill: { flex: 1 },
  albumArtEmpty: { alignItems: 'center', justifyContent: 'center' },
  soundDots: { position: 'absolute', top: 4, right: 0, flexDirection: 'row', gap: 4 },
  soundDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.ringSubtle },
  soundDotActive: { backgroundColor: w.accent },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  trackName: {
    ...type.bodySmall,
    fontFamily: w.fontRegular,
    color: palette.textPrimary,
    marginLeft: space.xs,
    flexShrink: 1,
  },

  // 5 — WITH PEOPLE
  facesRow: { flexDirection: 'row', marginTop: space.sm },
  faceCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: w.surface,
    backgroundColor: PLACEHOLDER_BLOCK,
  },
  faceOverlap: { marginLeft: -10 },
  peopleLine: {
    ...type.bodySmall,
    fontFamily: w.fontRegular,
    color: palette.textSecondary,
    marginTop: space.sm,
  },

  // EMPTY TILES (shared)
  emptyBody: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg },
  emptyPrompt: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: palette.textMuted,
    marginTop: space.sm,
    textAlign: 'center',
  },

  // 7 — PLACES
  placePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  placePill: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: palette.ringSubtle,
  },
  placePillText: { ...type.caption, fontFamily: w.fontRegular, color: palette.textPrimary },

  // 8 — FOR FUTURE YOU
  futureRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  futurePrompt: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: palette.textMuted,
    marginLeft: space.sm,
  },
  futureNoteText: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: palette.textPrimary,
    marginLeft: space.sm,
    flexShrink: 1,
  },

  // BOTTOM BUTTON
  dayCardButton: {
    backgroundColor: w.accent,
    borderRadius: radius.pill,
    paddingVertical: space.base,
    alignItems: 'center',
    marginTop: space.lg,
  },
  dayCardButtonText: {
    ...type.body,
    fontFamily: w.fontMedium,
    color: palette.presentBg,
  },
});
