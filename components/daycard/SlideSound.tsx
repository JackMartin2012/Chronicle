import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getWorld, motion, palette, radius, space, type } from '@/constants/chronicleTheme';
import type { MediaType, SoundEntry, SoundMode, SoundSlots } from '@/lib/types';

const { width: SCREEN_W } = Dimensions.get('window');
const ARTWORK = Math.round(SCREEN_W * 0.62);
const SWAP_THUMB = 56;

// Album art is square; film/TV posters are portrait (~2:3). Same height either
// way, so the slide's vertical layout doesn't change — only the width narrows.
const artworkBox = (mode: SoundMode) => ({
  width: mode === 'watch' ? Math.round((ARTWORK * 2) / 3) : ARTWORK,
  height: ARTWORK,
});
const swapThumbBox = (mode: SoundMode) => ({
  width: mode === 'watch' ? Math.round((SWAP_THUMB * 2) / 3) : SWAP_THUMB,
  height: SWAP_THUMB,
});

// derive an rgba from a hex token/glowColor so we can use it at partial opacity
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  world: 'past' | 'present';
  sound: SoundSlots;
};

// same labels the Sound editor's result rows use
const TYPE_LABEL: Record<MediaType, string> = { song: 'Song', podcast: 'Podcast', film: 'Film', tv: 'TV' };

// "Artist · Song" — subtitle first when there is one
const subLine = (e: SoundEntry) => (e.subtitle ? `${e.subtitle} · ${TYPE_LABEL[e.mediaType]}` : TYPE_LABEL[e.mediaType]);

// TODO: derive the glow from real artwork via react-native-image-colors when that
// decision is made; until then the glow is the world accent.

// Slide 6 — "Sound & screen". One shared layout for song / podcast / film / TV.
// If both listen and watch are filled, one is the centrepiece and the other sits
// as a small swap row at the bottom (tap to trade, short fade). If only one is
// filled, it is shown alone with no swap row. Progress + transport are decorative
// and shown for listen entries only. Rating is read-only. Chrome from carousel.
export default function SlideSound({ world, sound }: Props) {
  const w = getWorld(world);
  const fade = useRef(new Animated.Value(1)).current;

  const bothFilled = !!sound.listen && !!sound.watch;
  // start on listen when it exists, otherwise on watch
  const [activeMode, setActiveMode] = useState<SoundMode>(sound.listen ? 'listen' : 'watch');

  const active: SoundEntry | null = sound[activeMode] ?? sound.listen ?? sound.watch;
  const other: SoundEntry | null = bothFilled ? sound[activeMode === 'listen' ? 'watch' : 'listen'] : null;
  if (!active) return null; // the carousel only builds this slide when a slot is filled

  const isListen = active.mode === 'listen';
  const hasNote = active.note.trim().length > 0;

  const swap = () => {
    Animated.timing(fade, {
      toValue: 0,
      duration: motion.fadeMs / 2,
      useNativeDriver: true,
    }).start(() => {
      setActiveMode((m) => (m === 'listen' ? 'watch' : 'listen'));
      Animated.timing(fade, {
        toValue: 1,
        duration: motion.fadeMs / 2,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: w.bg }]}>
      <Animated.View style={[styles.fadeWrap, { opacity: fade }]}>
        {/* AMBIENT GLOW — radial-ish, from the world accent */}
        <LinearGradient
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.42, 1]}
          colors={[w.bg, withAlpha(w.accent, 0.3), w.bg]}
        />
        <LinearGradient
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          locations={[0, 0.5, 1]}
          colors={[w.bg, 'transparent', w.bg]}
        />

        <View style={styles.content}>
          {/* CENTREPIECE */}
          <View style={styles.centre}>
            {/* artwork, or the same icon-in-a-box the editor falls back to */}
            <View
              style={[styles.artwork, artworkBox(active.mode), { backgroundColor: w.surface, shadowColor: w.accent }]}
            >
              {active.artworkUrl ? (
                <Image source={{ uri: active.artworkUrl }} style={styles.artworkImg} />
              ) : (
                <View style={styles.noArt}>
                  <Ionicons name="film-outline" size={40} color={palette.textMuted} />
                </View>
              )}
            </View>

            <Text style={[styles.title, { fontFamily: w.fontBold }]}>{active.title}</Text>
            <Text style={[styles.sub, { fontFamily: w.fontRegular }]}>{subLine(active)}</Text>

            {/* progress + transport — decorative, LISTEN (song + podcast) only */}
            {isListen && (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { backgroundColor: w.accent }]} />
                  <View style={[styles.progressDot, { backgroundColor: w.accent }]} />
                </View>
                <View style={styles.transportRow}>
                  <Ionicons name="play-skip-back" size={22} color={w.accent} />
                  <Ionicons name="play" size={28} color={w.accent} style={styles.transportMid} />
                  <Ionicons name="play-skip-forward" size={22} color={w.accent} />
                </View>
              </>
            )}

            {/* RATING — read-only; nothing at all when unrated */}
            {active.rating > 0 && (
              <>
                <Text style={[styles.ratingScore, { fontFamily: w.fontMedium }]}>{active.rating}/10</Text>
                <View style={styles.ratingRow}>
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const n = idx + 1;
                    const isRating = n === active.rating;
                    const isFilled = n < active.rating;
                    return (
                      <View
                        key={n}
                        style={[
                          styles.ratingBox,
                          isRating
                            ? { backgroundColor: w.accent }
                            : isFilled
                            ? { backgroundColor: withAlpha(w.accent, 0.15) }
                            : { borderWidth: 1, borderColor: withAlpha(w.accent, 0.2) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.ratingNum,
                            { fontFamily: w.fontMedium },
                            isRating
                              ? { color: w.bg }
                              : isFilled
                              ? { color: palette.textSecondary }
                              : { color: palette.textMuted },
                          ]}
                        >
                          {n}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={[styles.hitLabel, { fontFamily: w.fontRegular }]}>How it hit</Text>
              </>
            )}

            {/* REACTION — only when there is a note */}
            {hasNote && (
              <Text style={[styles.reaction, { fontFamily: w.fontRegular }]}>“{active.note.trim()}”</Text>
            )}
          </View>

          {/* SWAP ROW — the other item, small at the bottom; only when both are filled */}
          {other && (
            <Pressable style={styles.swapRow} onPress={swap}>
              {other.artworkUrl ? (
                <Image source={{ uri: other.artworkUrl }} style={[styles.swapThumb, swapThumbBox(other.mode)]} />
              ) : (
                <View style={[styles.swapThumb, swapThumbBox(other.mode), { backgroundColor: w.surface }]} />
              )}
              <View style={styles.swapTextCol}>
                <Text style={[styles.swapTitle, { fontFamily: w.fontRegular }]} numberOfLines={1}>
                  {other.title}
                </Text>
                <Text style={[styles.swapMeta, { fontFamily: w.fontRegular }]} numberOfLines={1}>
                  {subLine(other)}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={20} color={palette.textMuted} />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fadeWrap: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: space.screenX,
    paddingTop: space.base,
    paddingBottom: space.sm,
    justifyContent: 'space-between',
  },

  // CENTREPIECE
  // fills the space above the swap row (or the whole slide when there is none) and
  // centres the artwork / title / transport / rating / note block within it
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artwork: {
    // width/height come from artworkBox(mode)
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  artworkImg: { width: '100%', height: '100%' },
  noArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: palette.textPrimary, textAlign: 'center', marginTop: space.md },
  sub: { ...type.body, color: palette.textSecondary, textAlign: 'center', marginTop: 2 },

  // progress (music only)
  progressTrack: {
    width: ARTWORK,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.ringSubtle, // white at 15%
    marginTop: space.md,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    borderRadius: 1.5,
  },
  progressDot: {
    position: 'absolute',
    left: '30%',
    top: -2.5,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
  },

  // transport (music only)
  transportRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  transportMid: { marginHorizontal: space.xl },

  // RATING
  ratingScore: {
    ...type.bodySmall,
    color: palette.textPrimary,
    textAlign: 'center',
    marginTop: space.base,
    marginBottom: space.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, // keeps the spacing the old 44pt-tall press targets gave the row
  },
  ratingBox: {
    width: 30,
    height: 30,
    marginHorizontal: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingNum: { ...type.micro },
  hitLabel: { ...type.caption, color: palette.textMuted, marginTop: space.xs },

  reaction: {
    ...type.bodySmall,
    color: palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },

  // SWAP ROW
  swapRow: { flexDirection: 'row', alignItems: 'center' },
  swapThumb: {
    // width/height come from swapThumbBox(mode)
    borderRadius: radius.sm,
    opacity: 0.5,
  },
  swapTextCol: { flex: 1, marginLeft: space.md },
  swapTitle: { ...type.bodySmall, color: palette.textSecondary },
  swapMeta: { ...type.caption, color: palette.textMuted, marginTop: 2 },
});
