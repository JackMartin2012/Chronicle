import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';

// derive an rgba from a hex accent token so we can use it at partial opacity
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  world?: 'past' | 'present';
  onClose?: () => void;
};

// Presentation-only mid-edit state (no storage/input wiring).
const WORDS = [
  { word: 'Warm', why: '' }, // filled, no reason yet → "Add why"
  { word: 'Unhurried', why: 'Everyone was in no rush today.' }, // filled + reason
  { word: '', why: '' }, // empty → placeholder + cursor
];
const PLACEHOLDERS = ['First word', 'Second word', 'Third word'];
const ACTIVE_INDEX = 2; // the slot currently being typed (blinking cursor)
const MOODS = ['😞', '😐', '🙂', '😊', '😌'];
const SELECTED_MOOD = 4; // the calm face

// Bottom-sheet editor for the "three words" tile. Composing, not form-filling:
// the words are the monumental hero; the reason is a skippable bonus under each.
export default function ThreeWordsEditor({ world = 'present', onClose = () => {} }: Props) {
  const w = getWorld(world);
  const insets = useSafeAreaInsets();

  // blinking cursor for the active empty slot
  const cursor = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursor, { toValue: 0, duration: 480, useNativeDriver: true }),
        Animated.timing(cursor, { toValue: 1, duration: 480, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cursor]);

  return (
    <View style={[styles.root, { backgroundColor: w.bg }]}>
      {/* dimmed content behind, tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* THE SHEET */}
      <View style={[styles.sheet, { backgroundColor: w.bg, paddingBottom: insets.bottom + space.base }]}>
        {/* grabber */}
        <View style={styles.grabber} />

        {/* header — chevron-down + quiet title */}
        <View style={styles.header}>
          <Pressable style={styles.headerLeft} onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-down" size={24} color={palette.textMuted} />
          </Pressable>
          <Text style={[styles.title, { fontFamily: w.fontRegular }]}>Today in three words</Text>
        </View>

        {/* THREE WORDS — the hero, centred in the space */}
        <View style={styles.words}>
          {WORDS.map((item, i) => (
            <View key={i} style={styles.slot}>
              {item.word ? (
                <>
                  <Text style={[styles.word, { fontFamily: w.fontBold }]}>{item.word}</Text>

                  {item.why ? (
                    // reason already written — quiet, italic, editable
                    <Pressable style={styles.whyRow} onPress={() => {}}>
                      <Text style={[styles.whyText, { fontFamily: w.fontRegular }]}>{item.why}</Text>
                      <Ionicons name="pencil" size={12} color={palette.textMuted} style={styles.whyPencil} />
                    </Pressable>
                  ) : (
                    // optional bonus — skippable, not a field
                    <Pressable style={styles.addWhyRow} onPress={() => {}}>
                      <Ionicons name="add" size={14} color={palette.textMuted} />
                      <Text style={[styles.addWhyText, { fontFamily: w.fontRegular }]}>Add why</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={styles.emptyRow}>
                  {i === ACTIVE_INDEX && (
                    <Animated.View style={[styles.cursor, { backgroundColor: w.accent, opacity: cursor }]} />
                  )}
                  <Text style={[styles.placeholder, { fontFamily: w.fontBold }]}>{PLACEHOLDERS[i]}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* MOOD */}
        <View style={styles.moodRow}>
          {MOODS.map((m, i) =>
            i === SELECTED_MOOD ? (
              <View
                key={i}
                style={[styles.moodSelected, { borderColor: withAlpha(w.accent, 0.5), shadowColor: w.accent }]}
              >
                <Text style={styles.moodSelectedEmoji}>{m}</Text>
              </View>
            ) : (
              <Text key={i} style={styles.moodEmoji}>
                {m}
              </Text>
            )
          )}
        </View>

        {/* BOTTOM */}
        <Text style={[styles.progress, { fontFamily: w.fontRegular }]}>This completes 2 of 8 for today</Text>
        <Pressable style={[styles.doneButton, { backgroundColor: w.accent }]} onPress={onClose}>
          <Text style={[styles.doneText, { fontFamily: w.fontMedium, color: w.bg }]}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  sheet: {
    height: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.screenX,
  },

  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.textPrimary,
    opacity: 0.2, // white at 20%
    alignSelf: 'center',
    marginTop: space.sm,
    marginBottom: space.base,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  headerLeft: { position: 'absolute', left: 0 },
  title: { ...type.label, color: palette.textSecondary },

  // THREE WORDS
  words: { flex: 1, justifyContent: 'center' },
  slot: { alignItems: 'center', marginVertical: space.lg },
  word: { ...type.wordHero, color: palette.textPrimary, textAlign: 'center' },
  placeholder: { ...type.wordHero, color: palette.textFaint, textAlign: 'center' }, // white at 25%

  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cursor: { width: 3, height: 42, borderRadius: 1.5, marginRight: 6 },

  // reason affordances (both states)
  addWhyRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  addWhyText: { ...type.bodySmall, color: palette.textMuted, marginLeft: 4 }, // white at 40%
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.lg,
  },
  whyText: { ...type.bodySmall, color: palette.textSecondary, fontStyle: 'italic', textAlign: 'center' }, // white at 70%
  whyPencil: { marginLeft: 6 },

  // MOOD
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
    marginBottom: space.lg,
  },
  moodEmoji: { fontSize: 26, opacity: 0.4, marginHorizontal: space.md },
  moodSelected: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: space.md,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  moodSelectedEmoji: { fontSize: 34 },

  // BOTTOM
  progress: { ...type.micro, color: palette.textMuted, textAlign: 'center', marginBottom: space.sm },
  doneButton: { borderRadius: radius.pill, paddingVertical: space.base, alignItems: 'center' },
  doneText: { ...type.body },
});
