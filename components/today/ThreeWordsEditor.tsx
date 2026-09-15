import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
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

import { getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '@/components/today/KeyboardDismissBar';
import { countFilledInputs, formatDateKey, loadDayEntry, saveDayEntry } from '@/lib/dayEntry';
import { MOOD_PALETTE, suggestMoods } from '@/lib/moodSuggestions';
import type { ThreeWord } from '@/lib/types';

// derive an rgba from a hex accent token so we can use it at partial opacity
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.78); // shared chrome — 78%, Places is the only exception

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const BACKDROP = 'rgba(0,0,0,0.55)';


// 8 columns inside the panel: sheet padding (24 each side) + panel padding (8 each side)
// The SLIDE uses type.wordHero (46/58). The editor can't: it has to fit three
// of these plus their reasons, the mood row and the footer on one screen. A
// size down keeps them monumental and stops the third word being cut off.
const WORD_SIZE = 32;
const WORD_LINE_HEIGHT = 38;

const EMOJI_COLUMNS = 8;
const { width: SCREEN_W } = Dimensions.get('window');
const EMOJI_TILE = Math.floor((SCREEN_W - space.xl * 2 - space.sm * 2) / EMOJI_COLUMNS);

type Props = {
  world?: 'past' | 'present';
  onClose?: () => void;
};

const PLACEHOLDERS = ['First word', 'Second word', 'Third word'];
const EMPTY_SLOTS: ThreeWord[] = [
  { word: '', why: '' },
  { word: '', why: '' },
  { word: '', why: '' },
];

// Bottom-sheet editor for the "three words" tile. Composing, not form-filling:
// the words are the monumental hero; the reason is a skippable bonus under each.
export default function ThreeWordsEditor({ world = 'present', onClose = () => {} }: Props) {
  const w = getWorld(world);
  const insets = useSafeAreaInsets();

  const [slots, setSlots] = useState<ThreeWord[]>(EMPTY_SLOTS);
  const [mood, setMood] = useState('');
  const [completed, setCompleted] = useState(0);
  // which slots have their reason field open. A written reason keeps its box
  // open so it can be edited; an unwritten one is opened by tapping "Add why".
  const [whyOpen, setWhyOpen] = useState<number[]>([]);
  // the grid behind the "+", so anything the map missed is still reachable —
  // by picking, never by typing
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);

  // Seed from today's record so reopening shows the words you saved. Stored
  // words are padded back out to three slots — the record only keeps the ones
  // that were actually written.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      const stored = day.threeWords.words;
      setSlots([0, 1, 2].map((i) => ({ word: stored[i]?.word ?? '', why: stored[i]?.why ?? '' })));
      // a written reason opens its field so it can be edited
      setWhyOpen(stored.map((word, i) => (word.why ? i : -1)).filter((i) => i >= 0));
      setMood(day.threeWords.mood);
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);

  const setWord = (index: number, word: string) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, word } : s)));
  const setWhy = (index: number, why: string) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, why } : s)));

  const hasAnything = slots.some((s) => s.word.trim() !== '') || mood !== '';

  // suggestions track what has been typed so far — the whole point is that they
  // come from the user's own words, never from a guess about their feelings
  const moods = suggestMoods(slots.map((s) => s.word));
  // a custom emoji must stay visible even though it isn't in the suggested set
  const moodRow = mood && !moods.includes(mood) ? [...moods, mood] : moods;

  const pickMood = (emoji: string) => {
    Haptics.selectionAsync();
    setMood((prev) => (prev === emoji ? '' : emoji));
  };

  const pickFromPanel = (emoji: string) => {
    Haptics.selectionAsync();
    setMood(emoji);
    setEmojiPanelOpen(false);
  };

  const handleDone = () => {
    if (hasAnything) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // drop blank slots, and keep a reason only where there's a word to hang it on
    const words = slots
      .filter((s) => s.word.trim() !== '')
      .map((s) => ({ word: s.word.trim(), why: s.why.trim() }));
    saveDayEntry(formatDateKey(new Date()), { threeWords: { words, mood } });
    Keyboard.dismiss();
    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      {/* dimmed content behind, tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* THE SHEET */}
      <View style={[styles.sheet, { backgroundColor: w.surface, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.sheetInner} onPress={Keyboard.dismiss} accessible={false}>
          {/* grabber */}
          <View style={styles.grabber} />

          {/* top row — chevron-down left, Done right */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={W60} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); handleDone(); }} hitSlop={10}>
              <Text style={[styles.topDone, { fontFamily: w.fontMedium, color: w.accent }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* title — left-aligned on its own line, like every other editor */}
          <Text style={[styles.title, { fontFamily: w.fontMedium }]}>Today in three words</Text>

        {/* THREE WORDS — the hero */}
        <ScrollView
          style={styles.words}
          contentContainerStyle={styles.wordsContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {slots.map((item, i) => {
            const hasWord = item.word.trim() !== '';
            const showWhy = whyOpen.includes(i) || item.why !== '';
            return (
              <View key={i} style={styles.slot}>
                <TextInput
                  inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                  style={[styles.word, { fontFamily: w.fontBold }]}
                  value={item.word}
                  onChangeText={(text) => setWord(i, text)}
                  placeholder={PLACEHOLDERS[i]}
                  placeholderTextColor={palette.textFaint}
                  selectionColor={w.accent}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  textAlign="center"
                  maxLength={18}
                />

                {/* the reason is a BONUS under a written word, never a second
                    field — the word alone is complete */}
                {hasWord &&
                  (showWhy ? (
                    <View style={styles.whyRow}>
                      <TextInput
                        inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                        style={[styles.whyText, { fontFamily: w.fontRegular }]}
                        value={item.why}
                        onChangeText={(text) => setWhy(i, text)}
                        placeholder="Why this word?"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={w.accent}
                        textAlign="center"
                        returnKeyType="done"
                        autoFocus={item.why === ''}
                      />
                      <Ionicons
                        name="pencil"
                        size={12}
                        color={palette.textMuted}
                        style={styles.whyPencil}
                      />
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addWhyRow}
                      onPress={() => setWhyOpen((prev) => [...prev, i])}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={14} color={palette.textMuted} />
                      <Text style={[styles.addWhyText, { fontFamily: w.fontRegular }]}>Add why</Text>
                    </Pressable>
                  ))}
              </View>
            );
          })}
        </ScrollView>

        {/* MOOD — drawn from the words above, never from a guess */}
        <Text style={[styles.moodLabel, { fontFamily: w.fontRegular }]}>
          Suggested from your words
        </Text>
        <View style={styles.moodRow}>
          {moodRow.map((m, i) =>
            m === mood ? (
              <Pressable
                key={`${m}-${i}`}
                onPress={() => pickMood(m)}
                style={[styles.moodSelected, { borderColor: withAlpha(w.accent, 0.5), shadowColor: w.accent }]}
              >
                <Text style={styles.moodSelectedEmoji}>{m}</Text>
              </Pressable>
            ) : (
              <Pressable key={`${m}-${i}`} onPress={() => pickMood(m)} hitSlop={6}>
                <Text style={styles.moodEmoji}>{m}</Text>
              </Pressable>
            )
          )}

          {/* "+" — anything the map didn't think of */}
          <Pressable
            onPress={() => setEmojiPanelOpen((open) => !open)}
            hitSlop={6}
            style={styles.moodPlus}
          >
            <Ionicons
              name={emojiPanelOpen ? 'remove' : 'add'}
              size={18}
              color={palette.textMuted}
            />
          </Pressable>
        </View>

        {/* THE MOOD PANEL — a finite set you pick from, never type into.
            Nested here in the sheet rather than raised as its own modal. */}
        {emojiPanelOpen && (
          <View style={[styles.emojiPanel, { backgroundColor: w.bg }]}>
            <View style={styles.emojiPanelHeader}>
              <Text style={[styles.emojiPanelTitle, { fontFamily: w.fontRegular }]}>
                Pick a mood
              </Text>
              <Pressable onPress={() => setEmojiPanelOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={18} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.emojiGrid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {MOOD_PALETTE.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => pickFromPanel(emoji)}
                  style={[
                    styles.emojiTile,
                    emoji === mood && {
                      borderColor: withAlpha(w.accent, 0.5),
                      shadowColor: w.accent,
                    },
                    emoji === mood && styles.emojiTileSelected,
                  ]}
                >
                  <Text style={styles.emojiTileText}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

          {/* footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={[styles.footerNote, { fontFamily: w.fontRegular }]}>
              This becomes your day card
            </Text>
            <View style={styles.progressRow}>
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={i}
                  style={[styles.progressDot, { backgroundColor: i < completed ? w.accent : palette.ringSubtle }]}
                />
              ))}
              <Text style={[styles.progressText, { fontFamily: w.fontRegular }]}>
                {completed} of 8 filled in today
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={hasAnything ? 0.85 : 1}
              onPress={hasAnything ? handleDone : undefined}
              style={[styles.doneButton, { backgroundColor: hasAnything ? w.accent : palette.hairline }]}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  { fontFamily: w.fontMedium, color: hasAnything ? palette.textPrimary : W30 },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
      <KeyboardDismissBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ---- SHARED CHROME — values copied from SoundEditor.tsx ----
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },

  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetInner: { flex: 1 },

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
  topDone: { fontSize: type.body.fontSize },

  title: {
    marginTop: space.lg, // 20
    paddingHorizontal: space.xl,
    textAlign: 'left',
    fontSize: 22,
    color: palette.textPrimary,
  },

  // THREE WORDS
  // horizontal padding moved here from the sheet — the shared chrome puts it on
  // the content, not the container
  words: { flex: 1, paddingHorizontal: space.xl },
  // paddingTop keeps the first word clear of the fixed title. NO
  // justifyContent: 'center' — centring a content container that overflows
  // pushes its top above the scroll origin, where it is clipped and cannot be
  // scrolled to, which is exactly how the first word ended up under the title.
  wordsContent: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    paddingTop: space.lg, // matches SoundEditor's title-to-content gap
    paddingBottom: space.sm,
  },
  slot: { alignItems: 'center', marginVertical: 5 },
  word: {
    fontSize: WORD_SIZE,
    lineHeight: WORD_LINE_HEIGHT,
    letterSpacing: -0.8,
    color: palette.textPrimary,
    textAlign: 'center',
    alignSelf: 'stretch',
    padding: 0, // no input box — the word IS the interface
  },

  // reason affordances (both states)
  addWhyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addWhyText: { ...type.bodySmall, color: palette.textMuted, marginLeft: 4 }, // white at 40%
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 4,
    paddingHorizontal: space.lg,
  },
  whyText: {
    ...type.bodySmall,
    color: palette.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    flexShrink: 1,
    padding: 0,
  },
  whyPencil: { marginLeft: 6 },

  // MOOD
  moodLabel: {
    ...type.micro,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: space.md,
    paddingHorizontal: space.xl,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: space.sm,
    marginBottom: space.base,
  },
  moodEmoji: { fontSize: 24, opacity: 0.4, marginHorizontal: space.sm },
  moodSelected: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: space.sm,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  moodSelectedEmoji: { fontSize: 28 },
  moodPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: space.sm,
  },
  // THE MOOD PANEL — bounded height so the words above it just get shorter
  // (they flex) rather than the sheet growing
  emojiPanel: {
    height: 196,
    marginHorizontal: space.xl,
    marginBottom: space.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  emojiPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  emojiPanelTitle: { ...type.micro, color: palette.textMuted },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
  },
  emojiTile: {
    width: EMOJI_TILE,
    height: EMOJI_TILE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: EMOJI_TILE / 2,
    borderWidth: 1.5,
    borderColor: 'transparent', // only the selected tile shows its ring
  },
  emojiTileSelected: {
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  emojiTileText: { fontSize: 24 },

  // ---- FOOTER — values copied from SoundEditor.tsx / LearnedEditor.tsx ----
  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline, marginTop: space.lg },
  footerNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: type.label.fontSize,
    color: palette.textMuted,
  },
  progressRow: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  progressText: { marginLeft: 4, fontSize: type.label.fontSize, color: palette.textMuted },
  doneButton: {
    marginTop: space.md,
    marginHorizontal: space.xl,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: { fontSize: type.body.fontSize },
});
