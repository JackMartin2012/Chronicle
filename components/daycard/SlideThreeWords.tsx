import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { dim, getWorld, motion, palette, space, type } from '@/constants/chronicleTheme';

type WordItem = { word: string; reason?: string };

// TODO: real three-words entry; sample data for now.
const WORDS: WordItem[] = [
  { word: 'Warm', reason: "Everyone came back for Mum's birthday, first time in three years." },
  { word: 'Unhurried' },
  { word: 'Reunion', reason: 'Old faces around one table again — nobody checked the time.' },
];
const MOOD = '😌';

type Props = {
  world: 'past' | 'present';
};

// Slide 4 — "Three words". Pure typography: three monumental words, each with an
// optional reason revealed on tap (the other two dim while one is open).
// Chrome comes from DayCardCarousel.
export default function SlideThreeWords({ world }: Props) {
  const w = getWorld(world);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // one opacity value per word — dims the non-expanded words to dim.inactive
  const opacities = useRef(WORDS.map(() => new Animated.Value(dim.full))).current;

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
      {WORDS.map((item, i) => {
        const hasReason = !!item.reason;
        const isExpanded = expandedIndex === i;
        return (
          <Animated.View key={i} style={[styles.entry, { opacity: opacities[i] }]}>
            <Pressable style={styles.wordTap} onPress={() => hasReason && toggle(i)}>
              <Text style={[styles.word, { fontFamily: w.fontBold }]}>{item.word}</Text>
              {hasReason && <View style={[styles.dot, { backgroundColor: w.accent }]} />}
            </Pressable>

            {isExpanded && item.reason ? (
              <Text style={[styles.reason, { fontFamily: w.fontRegular }]}>
                “{item.reason}”
              </Text>
            ) : null}
          </Animated.View>
        );
      })}

      <Text style={styles.mood}>{MOOD}</Text>
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
