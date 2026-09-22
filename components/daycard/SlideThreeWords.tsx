import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { dim, getWorld, motion, palette, space, type } from '@/constants/chronicleTheme';
import type { ThreeWord } from '@/lib/types';

// One Animated.Value per slot, regardless of how many words this day actually
// has (0-3) — real days never have all three filled with a reason, unlike the
// old fixed 3-item sample.
const MAX_WORDS = 3;

type Props = {
  world: 'past' | 'present';
  /** 0-3 entries — DayCardData.threeWords is only non-null when at least one word is filled. */
  words: ThreeWord[];
  /** Emoji; omitted when unset. */
  mood?: string;
};

// Slide 4 — "Three words". Pure typography: up to three monumental words, each
// with an optional reason revealed on tap (the other words dim while one is
// open). Chrome comes from DayCardCarousel.
export default function SlideThreeWords({ world, words, mood }: Props) {
  const w = getWorld(world);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // fixed-size regardless of `words.length` so hook order never changes
  const opacities = useRef(
    Array.from({ length: MAX_WORDS }, () => new Animated.Value(dim.full))
  ).current;

  useEffect(() => {
    opacities.forEach((op, i) => {
      const target = expandedIndex === null || expandedIndex === i ? dim.full : dim.inactive;
      Animated.timing(op, {
        toValue: target,
        duration: motion.fadeMs,
        useNativeDriver: true,
      }).start();
    });
  }, [expandedIndex, opacities]);

  const toggle = (i: number) => setExpandedIndex((prev) => (prev === i ? null : i));

  return (
    <View style={styles.root}>
      {words.map((item, i) => {
        const hasReason = !!item.why.trim();
        const isExpanded = expandedIndex === i;
        return (
          <Animated.View key={i} style={[styles.entry, { opacity: opacities[i] }]}>
            <Pressable style={styles.wordTap} onPress={() => hasReason && toggle(i)}>
              <Text style={[styles.word, { fontFamily: w.fontBold }]}>{item.word}</Text>
              {hasReason && <View style={[styles.dot, { backgroundColor: w.accent }]} />}
            </Pressable>

            {isExpanded && hasReason ? (
              <Text style={[styles.reason, { fontFamily: w.fontRegular }]}>
                “{item.why}”
              </Text>
            ) : null}
          </Animated.View>
        );
      })}

      {mood ? <Text style={styles.mood}>{mood}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // centre the whole stack vertically in the available space
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.screenX,
  },

  entry: { alignItems: 'center', marginVertical: space.md },

  // shrink-wraps the word so the underline's 40% is relative to the word width
  wordTap: { alignItems: 'center' },
  word: { ...type.wordHero, color: palette.textPrimary, textAlign: 'center' },
  // small filled accent dot — signals the word can be tapped to reveal its reason
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: space.xs,
  },

  reason: {
    ...type.body,
    color: palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },

  mood: {
    fontSize: 40,
    textAlign: 'center',
    marginTop: space.xxl,
  },
});
