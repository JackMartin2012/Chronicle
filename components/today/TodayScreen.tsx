import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
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

// Present-world tokens are used throughout this presentation-only screen.
const w = getWorld('present');

const { height: SCREEN_H } = Dimensions.get('window');
const CAPTURE_HEIGHT = Math.round(SCREEN_H * 0.22);
const ALBUM_ART_SIZE = 96; // fixed square — must not stretch to fill the tile

// TODO: throwaway placeholder fill for where real media will go — NOT a theme
// colour. Swap these blocks for real photos when the screen is wired up.
const PLACEHOLDER_BLOCK = '#3a3f4a';

// ---------------------------------------------------------------------------
// SAMPLE DATA (presentation only — not wired to storage/camera/navigation)
// ---------------------------------------------------------------------------

const SAMPLE = {
  weekday: 'Friday',
  dateLine: '24 July',
  progress: { done: 5, total: 8 },
  captureTime: '18:04',
  threeWords: 'Warm · Unhurried · Reunion',
  moodEmoji: '😌',
  dayText:
    'Woke up late and let the morning drift. Met the others by the river and we walked the long way round, stopping for coffee where the light came through the trees. Nobody was in a hurry and it felt like the old days again, before everyone scattered.',
  trackName: 'Glittering Horizon',
  peopleLine: 'Alex, Sam & Mum',
};

// Static waveform placeholder heights.
const WAVE = [6, 12, 18, 9, 14, 20, 8, 11, 16, 10, 7, 15, 19, 12, 9, 13, 17, 8, 14, 11];

// ---------------------------------------------------------------------------
// PROGRESS RING
// ---------------------------------------------------------------------------

const RING_SIZE = 52;
const RING_STROKE = 4;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

function ProgressRing({ done, total }: { done: number; total: number }) {
  const offset = RING_CIRC * (1 - done / total);
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
          <Circle
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

function PressableTile({
  children,
  style,
  innerStyle,
  padded = true,
  onPress,
}: {
  children: React.ReactNode;
  style?: object;
  innerStyle?: object;
  padded?: boolean;
  onPress?: () => void;
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

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress ?? (() => {})}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.tile, padded && styles.tilePadded, innerStyle]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Muted top-left heading shared by every tile.
function TileHeading({ children }: { children: string }) {
  return <Text style={styles.tileHeading}>{children}</Text>;
}

// ---------------------------------------------------------------------------
// SCREEN
// ---------------------------------------------------------------------------

export default function TodayScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
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
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topWeekday}>{SAMPLE.weekday}</Text>
            <Text style={styles.topDate}>{SAMPLE.dateLine}</Text>
          </View>
          <ProgressRing done={SAMPLE.progress.done} total={SAMPLE.progress.total} />
        </View>

        {/* 1 — TODAY'S CAPTURE */}
        <PressableTile innerStyle={{ height: CAPTURE_HEIGHT }} padded={false}>
          {/* TODO: real captured photo — solid fallback block so the tile always shows */}
          <View style={[StyleSheet.absoluteFill, styles.capturePhotoFallback]} />

          {/* TODO: real selfie — solid fallback block */}
          <View style={styles.selfieInset} />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={styles.captureGradient}
          >
            <Text style={styles.captureHeading}>Today&apos;s capture</Text>
            <Text style={styles.captureTime}>{SAMPLE.captureTime}</Text>
          </LinearGradient>
        </PressableTile>

        {/* 2 — THREE WORDS */}
        <PressableTile>
          <TileHeading>Today in three words</TileHeading>
          <Text style={styles.threeWords}>
            {SAMPLE.threeWords} {SAMPLE.moodEmoji}
          </Text>
        </PressableTile>

        {/* 3 — YOUR DAY */}
        <PressableTile>
          <TileHeading>Your day</TileHeading>
          <Text style={styles.dayBody} numberOfLines={3}>
            {SAMPLE.dayText}
          </Text>
          <Text style={styles.moreLink}>more</Text>
          <View style={styles.waveform}>
            {WAVE.map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h }]} />
            ))}
          </View>
        </PressableTile>

        {/* 4 & 5 — LISTENING TO / WITH PEOPLE */}
        <View style={styles.halfRow}>
          <PressableTile style={styles.halfTile} innerStyle={styles.halfTileInner}>
            <TileHeading>Listening to</TileHeading>
            {/* TODO: real album artwork — solid placeholder block */}
            <View style={styles.albumArt} />
            <View style={styles.trackRow}>
              <Ionicons name="play" size={14} color={w.accent} />
              <Text style={styles.trackName} numberOfLines={1}>
                {SAMPLE.trackName}
              </Text>
            </View>
          </PressableTile>

          <PressableTile style={styles.halfTile} innerStyle={styles.halfTileInner}>
            <TileHeading>With people</TileHeading>
            <View style={styles.facesRow}>
              {/* TODO: real people photos — solid placeholder blocks */}
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.faceCircle, i > 0 && styles.faceOverlap]} />
              ))}
            </View>
            <Text style={styles.peopleLine}>{SAMPLE.peopleLine}</Text>
          </PressableTile>
        </View>

        {/* 6 & 7 — SOMETHING YOU LEARNED / PLACES (empty) */}
        <View style={styles.halfRow}>
          <PressableTile style={styles.halfTile}>
            <TileHeading>Something you learned</TileHeading>
            <View style={styles.emptyBody}>
              <Ionicons name="bulb-outline" size={24} color={palette.textMuted} />
              <Text style={styles.emptyPrompt}>Add something you learned</Text>
            </View>
          </PressableTile>

          <PressableTile style={styles.halfTile}>
            <TileHeading>Places</TileHeading>
            <View style={styles.emptyBody}>
              <Ionicons name="location-outline" size={24} color={palette.textMuted} />
              <Text style={styles.emptyPrompt}>Where did today take you?</Text>
            </View>
          </PressableTile>
        </View>

        {/* 8 — FOR FUTURE YOU (empty) */}
        <PressableTile>
          <TileHeading>For future you</TileHeading>
          <View style={styles.futureRow}>
            <Ionicons name="mail-outline" size={20} color={palette.textMuted} />
            <Text style={styles.futurePrompt}>Leave a note for future you</Text>
          </View>
        </PressableTile>

        {/* BOTTOM — SEE TODAY AS A DAY CARD */}
        <Pressable style={styles.dayCardButton} onPress={() => {}}>
          <Text style={styles.dayCardButtonText}>See today as a day card</Text>
        </Pressable>
      </ScrollView>
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

  // 1 — CAPTURE
  capturePhotoFallback: { backgroundColor: w.surface },
  selfieInset: {
    position: 'absolute',
    top: space.base,
    left: space.base,
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
    backgroundColor: PLACEHOLDER_BLOCK, // TODO: real selfie
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
  captureTime: { ...type.caption, fontFamily: w.fontRegular, color: palette.textPrimary, marginTop: 2 },

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

  // 4 — LISTENING TO
  albumArt: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: radius.md,
    marginTop: space.sm,
    backgroundColor: PLACEHOLDER_BLOCK, // TODO: real album artwork
  },
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
    backgroundColor: PLACEHOLDER_BLOCK, // TODO: real people photos
  },
  faceOverlap: { marginLeft: -10 },
  peopleLine: {
    ...type.bodySmall,
    fontFamily: w.fontRegular,
    color: palette.textSecondary,
    marginTop: space.sm,
  },

  // 6 & 7 — EMPTY TILES
  emptyBody: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg },
  emptyPrompt: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: palette.textMuted,
    marginTop: space.sm,
    textAlign: 'center',
  },

  // 8 — FOR FUTURE YOU
  futureRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  futurePrompt: {
    ...type.caption,
    fontFamily: w.fontRegular,
    color: palette.textMuted,
    marginLeft: space.sm,
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
