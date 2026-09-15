import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorld, palette, space, type } from '@/constants/chronicleTheme';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';
import { countFilledInputs, formatDateKey, loadDayEntry, saveDayEntry } from '@/lib/dayEntry';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.78);

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W35 = 'rgba(255,255,255,0.35)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const W06 = 'rgba(255,255,255,0.06)';
const BACKDROP = 'rgba(0,0,0,0.55)';


const QUESTIONS = [
  'What surprised you today?',
  'What did you figure out?',
  "What do you know now that you didn't this morning?",
  'What changed your mind today?',
  'What did someone teach you?',
  'What did you get wrong?',
];

export default function LearnedEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  const [text, setText] = useState('');
  const [completed, setCompleted] = useState(0);

  // Seed from today's record so reopening shows what you saved. Runs once on
  // mount; a later save never re-seeds and can't clobber what you're typing.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      setText(day.learned);
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * QUESTIONS.length));
  const shuffleScale = useRef(new Animated.Value(1)).current;

  // The sheet is FIXED-HEIGHT and bottom-anchored, so KeyboardAvoidingView's
  // padding behaviour translates the whole thing upward and takes the title and
  // top row off screen. Instead the keyboard height is tracked directly: the
  // sheet's top edge stays put, its bottom sits on the keyboard, and the body
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
  // never taller than the space left above the keyboard
  const sheetHeight = keyboardUp
    ? Math.min(SHEET_HEIGHT, SCREEN_H - keyboardHeight - insets.top - space.sm)
    : SHEET_HEIGHT;

  const hasText = text.trim().length > 0;

  const shuffle = () => {
    setQIndex((i) => (i + 1) % QUESTIONS.length);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(shuffleScale, { toValue: 1.12, useNativeDriver: true, speed: 50, bounciness: 14 }),
      Animated.spring(shuffleScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
    ]).start();
  };

  const handleDone = () => {
    if (hasText) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveDayEntry(formatDateKey(new Date()), { learned: text.trim() });
    dismiss();
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            // sits the sheet on top of the keyboard instead of under it
            marginBottom: keyboardHeight,
            // the home indicator is irrelevant once the keyboard covers it
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

        {/* title + shuffle */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>What did you learn today?</Text>
          <Animated.View style={{ transform: [{ scale: shuffleScale }] }}>
            <TouchableOpacity
              onPress={shuffle}
              activeOpacity={0.8}
              style={styles.shuffle}
              accessibilityRole="button"
              accessibilityLabel="Shuffle question"
            >
              <Ionicons name="shuffle" size={18} color={w.accent} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* body — the hero writing area */}
        <View style={styles.body}>
          <Ionicons name="bulb-outline" size={26} color={w.accent} />
          <TextInput
            inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
            style={styles.hero}
            value={text}
            onChangeText={setText}
            placeholder={QUESTIONS[qIndex]}
            placeholderTextColor={W35}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerNote}>This joins your things learned</Text>
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
            activeOpacity={hasText ? 0.85 : 1}
            onPress={hasText ? handleDone : undefined}
            style={[styles.doneButton, { backgroundColor: hasText ? w.accent : palette.hairline }]}
          >
            <Text style={[styles.doneButtonText, { color: hasText ? palette.textPrimary : W30 }]}>Done</Text>
          </TouchableOpacity>
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
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: W20, alignSelf: 'center', marginTop: space.sm },

  topRow: {
    marginTop: space.base,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topDone: { fontFamily: w.fontMedium, fontSize: type.body.fontSize, color: w.accent },

  titleRow: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { flex: 1, fontFamily: w.fontMedium, fontSize: 22, color: palette.textPrimary },
  shuffle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 16,
    backgroundColor: W06,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1, marginTop: space.xl, paddingHorizontal: space.xl },
  hero: {
    flex: 1,
    marginTop: space.base,
    fontFamily: w.fontMedium,
    fontSize: 30,
    lineHeight: 40,
    color: palette.textPrimary,
    textAlignVertical: 'top',
  },

  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline, marginTop: space.lg },
  footerNote: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: w.fontRegular,
    fontSize: type.label.fontSize,
    color: palette.textMuted,
  },
  progressRow: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  progressText: { marginLeft: 4, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: palette.textMuted },
  doneButton: {
    marginTop: space.md,
    marginHorizontal: space.xl,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: { fontFamily: w.fontMedium, fontSize: type.body.fontSize },
});
