import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
const W50 = 'rgba(255,255,255,0.5)';
const W35 = 'rgba(255,255,255,0.35)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const W10 = 'rgba(255,255,255,0.1)';
const W04 = 'rgba(255,255,255,0.04)';
const BACKDROP = 'rgba(0,0,0,0.55)';


// rgba from a hex token so past-world purple can be used at partial opacity
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type WhenKey = 'month' | 'year' | 'random' | 'date';
const WHEN_OPTIONS: { key: WhenKey; label: string }[] = [
  { key: 'month', label: 'In a month' },
  { key: 'year', label: 'In a year' },
  { key: 'random', label: 'Random future day' },
  { key: 'date', label: 'Pick a date' },
];

type SurfacedNote = { text: string; writtenAgo: string; date: string };

export default function FutureNoteEditor({
  onClose,
  surfacedNote,
}: {
  onClose?: () => void;
  surfacedNote?: SurfacedNote;
}) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});
  const replyRef = useRef<TextInput>(null);

  const [note, setNote] = useState('');
  const [completed, setCompleted] = useState(0);

  // Seed from today's record so reopening shows the note you left, and the
  // "when" you chose for it.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      const stored = day.futureNote;
      setNote(stored.note);
      setIsQuestion(stored.isQuestion);
      setReply(stored.reply);
      if (stored.when) setWhen(stored.when);
      // a picked date is only recoverable from the resolved surface key
      if (stored.when === 'date' && stored.surfaceKey) {
        setPickedDate(new Date(`${stored.surfaceKey}T12:00:00`));
      }
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);
  const [reply, setReply] = useState('');
  const [when, setWhen] = useState<WhenKey>('year');
  const [isQuestion, setIsQuestion] = useState(false);
  const [pickedDate, setPickedDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });

  const hasNote = note.trim().length > 0;

  // The sheet is FIXED-HEIGHT and bottom-anchored, so KeyboardAvoidingView's
  // padding behaviour translates the whole thing upward and takes the title and
  // top row off screen. Instead the keyboard height is tracked directly: the
  // sheet's top edge stays put, its bottom sits on the keyboard, and the middle
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

  const stepMonth = (delta: number) =>
    setPickedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });

  const confirmLine =
    when === 'month'
      ? 'You’ll see this again in a month.'
      : when === 'year'
      ? 'You’ll see this again in a year.'
      : when === 'random'
      ? 'You’ll see this again on a random day in the future.'
      : `You’ll see this again on ${pickedDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}.`;

  /**
   * Resolve the "when" choice to a concrete date key.
   *
   * Included because otherwise `pickedDate` is lost on save and a note has no
   * date at all — 'random' in particular has to be decided once and stored,
   * not re-rolled on every read, or the note never actually arrives.
   */
  const resolveSurfaceKey = () => {
    if (when === 'date') return formatDateKey(pickedDate);
    const days =
      when === 'month' ? 30 : when === 'year' ? 365 : 60 + Math.floor(Math.random() * 670);
    const target = new Date();
    target.setDate(target.getDate() + days);
    return formatDateKey(target);
  };

  const handleDone = () => {
    if (hasNote) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveDayEntry(formatDateKey(new Date()), {
      futureNote: {
        note: note.trim(),
        when,
        surfaceKey: resolveSurfaceKey(),
        isQuestion,
        reply: reply.trim(),
      },
    });
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
            marginBottom: keyboardHeight,
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

        {/* title */}
        <Text style={styles.title}>Leave a note for future you</Text>

        {/* middle (scrolls) */}
        <ScrollView
          style={styles.middle}
          contentContainerStyle={styles.middleContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PART 1 — surfaced note from the past (conditional) */}
          {surfacedNote && (
            <>
              <View style={styles.pastCard}>
                <View style={styles.pastHeader}>
                  <Ionicons name="mail-open-outline" size={18} color={W50} />
                  <Text style={styles.pastMeta}>
                    {surfacedNote.writtenAgo} · {surfacedNote.date}
                  </Text>
                </View>
                <Text style={styles.pastNote}>{surfacedNote.text}</Text>
                <TouchableOpacity onPress={() => replyRef.current?.focus()} hitSlop={8} style={styles.replyLinkWrap}>
                  <Text style={styles.replyLink}>Reply to past you</Text>
                </TouchableOpacity>
                <View style={styles.replyBox}>
                  <TextInput
                    inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                    ref={replyRef}
                    style={styles.replyInput}
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Write back…"
                    placeholderTextColor={W35}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* PART 2 — compose a new note */}
          <Ionicons name="mail-outline" size={24} color={w.accent} style={styles.composeIcon} />
          <TextInput
            inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
            style={styles.composeInput}
            value={note}
            onChangeText={setNote}
            placeholder="What do you want future you to know?"
            placeholderTextColor={W35}
            multiline
            textAlignVertical="top"
          />

          {/* WHEN PICKER */}
          <Text style={styles.whenLabel}>When should this come back?</Text>
          <View style={styles.chipsRow}>
            {WHEN_OPTIONS.map((opt) => {
              const selected = when === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.85}
                  onPress={() => setWhen(opt.key)}
                  style={[
                    styles.chip,
                    selected
                      ? { backgroundColor: withAlpha(w.accent, 0.18), borderColor: w.accent }
                      : { borderColor: palette.ringSubtle },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? w.accent : W60 }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {when === 'date' && (
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => stepMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={w.accent} />
              </TouchableOpacity>
              <Text style={styles.stepperText}>
                {pickedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => stepMonth(1)} hitSlop={10}>
                <Ionicons name="chevron-forward" size={20} color={w.accent} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.confirmLine}>{confirmLine}</Text>

          {/* QUESTION TOGGLE */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Make this a question I answer later</Text>
            <Switch
              value={isQuestion}
              onValueChange={setIsQuestion}
              trackColor={{ false: W10, true: w.accent }}
              ios_backgroundColor={W10}
            />
          </View>
        </ScrollView>

        {/* footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerNote}>This becomes a note to future you</Text>
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
            activeOpacity={hasNote ? 0.85 : 1}
            onPress={hasNote ? handleDone : undefined}
            style={[styles.doneButton, { backgroundColor: hasNote ? w.accent : palette.hairline }]}
          >
            <Text style={[styles.doneButtonText, { color: hasNote ? palette.textPrimary : W30 }]}>Done</Text>
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

  title: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    textAlign: 'left',
    fontFamily: w.fontMedium,
    fontSize: 22,
    color: palette.textPrimary,
  },

  middle: { flex: 1 },
  middleContent: { paddingBottom: space.lg },

  // PART 1 — the surfaced note (purple = came from the Past world; used ONLY here)
  pastCard: {
    marginTop: space.lg,
    marginHorizontal: space.xl,
    padding: 18,
    borderRadius: 18,
    backgroundColor: withAlpha(palette.pastBg, 0.6),
    borderWidth: 1,
    borderColor: withAlpha(palette.pastAccent, 0.25),
  },
  pastHeader: { flexDirection: 'row', alignItems: 'center' },
  pastMeta: { marginLeft: 8, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: W50 },
  pastNote: { marginTop: space.md, fontFamily: w.fontRegular, fontSize: 17, lineHeight: 25, color: palette.textPrimary },
  replyLinkWrap: { marginTop: 16, alignSelf: 'flex-start' },
  replyLink: { fontFamily: w.fontRegular, fontSize: 14, color: palette.pastAccent },
  replyBox: {
    marginTop: 10,
    backgroundColor: W04,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: withAlpha(palette.pastAccent, 0.15),
  },
  replyInput: {
    minHeight: 66,
    fontFamily: w.fontRegular,
    fontSize: type.bodySmall.fontSize,
    color: palette.textPrimary,
    textAlignVertical: 'top',
  },

  divider: { height: 1, backgroundColor: palette.hairline, marginVertical: space.xl, marginHorizontal: space.xl },

  // PART 2 — compose
  composeIcon: { marginTop: space.lg, marginLeft: space.xl },
  composeInput: {
    marginTop: 14,
    paddingHorizontal: space.xl,
    fontFamily: w.fontRegular,
    fontSize: 20,
    lineHeight: 30,
    color: palette.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // WHEN picker
  whenLabel: { marginTop: space.xl, paddingHorizontal: space.xl, fontFamily: w.fontRegular, fontSize: 14, color: W50 },
  chipsRow: { marginTop: space.md, paddingHorizontal: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: w.fontRegular, fontSize: 14 },
  stepper: { marginTop: space.md, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center' },
  stepperText: { marginHorizontal: 16, fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },
  confirmLine: {
    marginTop: space.md,
    paddingHorizontal: space.xl,
    fontFamily: w.fontRegular,
    fontSize: type.label.fontSize,
    color: palette.textMuted,
  },

  // question toggle
  toggleRow: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { flex: 1, marginRight: 12, fontFamily: w.fontRegular, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },

  // footer
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
