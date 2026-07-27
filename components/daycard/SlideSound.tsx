import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { getWorld, motion, palette, radius, space, type } from '@/constants/chronicleTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const ARTWORK = Math.round(SCREEN_W * 0.62);

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
};

// TODO: derive glowColor from real artwork via react-native-image-colors when
// images are wired; artwork/poster are solid world.surface blocks for now.
const MUSIC = {
  title: 'Glittering Horizon',
  artist: 'Neon Atmosphere',
  rating: 8,
  reaction: 'Reminds me of driving back from Cornwall last summer.',
  glowColor: '#e0a05a',
  store: 'Apple Music',
};
const FILM = {
  title: 'The Solitary Hour',
  meta: 'Series 1 · Episode 4 · 48 min',
  rating: 7,
  reaction: 'Watched it half asleep and still thought about it all week.',
  glowColor: '#5a7ae0',
  store: 'Apple TV',
};

// Slide 6 — "Sound & screen". Music or film as the centrepiece; the other sits
// as a small swap row at the bottom. Tapping the swap row trades them with a
// short fade. Progress + transport belong to music only. Chrome from carousel.
export default function SlideSound({ world }: Props) {
  const w = getWorld(world);
  const [showFilm, setShowFilm] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const active = showFilm ? FILM : MUSIC;
  const other = showFilm ? MUSIC : FILM;
  const activeSub = showFilm ? FILM.meta : MUSIC.artist;
  const otherSub = showFilm ? MUSIC.artist : FILM.meta;

  // ratings are editable, tracked per item
  const [ratings, setRatings] = useState({ music: MUSIC.rating, film: FILM.rating });
  const activeRating = showFilm ? ratings.film : ratings.music;
  const setActiveRating = (n: number) =>
    setRatings((r) => (showFilm ? { ...r, film: n } : { ...r, music: n }));

  const swap = () => {
    Animated.timing(fade, {
      toValue: 0,
      duration: motion.fadeMs / 2,
      useNativeDriver: true,
    }).start(() => {
      setShowFilm((v) => !v);
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
        {/* AMBIENT GLOW — radial-ish, from the active item's glowColor */}
        <LinearGradient
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.42, 1]}
          colors={[w.bg, withAlpha(active.glowColor, 0.3), w.bg]}
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
            {/* artwork / poster placeholder */}
            <View
              style={[styles.artwork, { backgroundColor: w.surface, shadowColor: active.glowColor }]}
            />

            <Text style={[styles.title, { fontFamily: w.fontBold }]}>{active.title}</Text>
            <Text style={[styles.sub, { fontFamily: w.fontRegular }]}>{activeSub}</Text>

            {/* progress + transport — MUSIC ONLY */}
            {!showFilm && (
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

            {/* RATING — editable; score above the boxes so the row fits comfortably */}
            <Text style={[styles.ratingScore, { fontFamily: w.fontMedium }]}>{activeRating}/10</Text>
            <View style={styles.ratingRow}>
              {Array.from({ length: 10 }).map((_, idx) => {
                const n = idx + 1;
                const isRating = n === activeRating;
                const isFilled = n < activeRating;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setActiveRating(n)}
                    hitSlop={{ top: 8, bottom: 8, left: 3, right: 3 }}
                    style={styles.ratingPress}
                  >
                    <View
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
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.hitLabel, { fontFamily: w.fontRegular }]}>How it hit</Text>

            {/* REACTION */}
            <Text style={[styles.reaction, { fontFamily: w.fontRegular }]}>
              “{active.reaction}”
            </Text>

            {/* STORE */}
            <Text style={[styles.store, { fontFamily: w.fontRegular }]}>{active.store}</Text>
          </View>

          {/* SWAP ROW — the other item, small at the bottom */}
          <Pressable style={styles.swapRow} onPress={swap}>
            <View style={[styles.swapThumb, { backgroundColor: w.surface }]} />
            <View style={styles.swapTextCol}>
              <Text style={[styles.swapTitle, { fontFamily: w.fontRegular }]} numberOfLines={1}>
                {other.title}
              </Text>
              <Text style={[styles.swapMeta, { fontFamily: w.fontRegular }]} numberOfLines={1}>
                {otherSub}
              </Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color={palette.textMuted} />
          </Pressable>
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
  centre: { alignItems: 'center' },
  artwork: {
    width: ARTWORK,
    height: ARTWORK,
    borderRadius: radius.lg,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
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
  },
  // larger touch target: 30pt box + 8pt vertical padding + hitSlop → ≥44pt tall
  ratingPress: {
    paddingVertical: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBox: {
    width: 30,
    height: 30,
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
  store: { ...type.caption, color: palette.textMuted, marginTop: space.sm },

  // SWAP ROW
  swapRow: { flexDirection: 'row', alignItems: 'center' },
  swapThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    opacity: 0.5,
  },
  swapTextCol: { flex: 1, marginLeft: space.md },
  swapTitle: { ...type.bodySmall, color: palette.textSecondary },
  swapMeta: { ...type.caption, color: palette.textMuted, marginTop: 2 },
});
