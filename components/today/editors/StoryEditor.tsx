import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.78);

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W40 = 'rgba(255,255,255,0.4)';
const W30 = 'rgba(255,255,255,0.3)';
const W25 = 'rgba(255,255,255,0.25)';
const BACKDROP = 'rgba(0,0,0,0.55)';

const COMPLETED = 4; // TODO: real day-progress count comes with wiring

// ---- the page ----
// Matched to SlideStory.tsx so the editor and the day card are visibly the same
// object: same rule spacing, same faint white rules, same muted-red margin rule.
// The entry's lineHeight equals RULE_SPACING so the writing sits ON the rules.
const RULE_SPACING = 28;
const ENTRY_FONT_SIZE = 18;

// The text's top padding MUST be a multiple of RULE_SPACING. The rules are drawn
// at (i+1) * RULE_SPACING, so any other value puts every line half a rule out of
// register and the first rule cuts through the opening line.
const PAGE_TOP_PADDING = RULE_SPACING;

const REVEAL_MS = 200;

// TODO: real day entry; sample text so the serif can be judged at real length.
const SAMPLE_ENTRY = `Spent most of the afternoon in the garden with Alex and Sam. Mum made the cake she always makes, the one with too much lemon in it, and nobody said anything.

It rained at six and not one person moved. We just sat there getting wet and laughing about it.`;

export default function StoryEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  const [entry, setEntry] = useState(SAMPLE_ENTRY);

  // The sheet is FIXED-HEIGHT and bottom-anchored, so KeyboardAvoidingView's
  // padding behaviour translates the whole thing upward and takes the title and
  // top row off screen. Instead the keyboard height is tracked directly: the
  // sheet's top edge stays put, its bottom sits on the keyboard, and the middle
  // — and therefore the page — absorbs the difference.
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

  // While typing, nothing but the page is doing any work: the voice row, the
  // completion line and the dots all collapse and fade, and the page — which
  // flexes — takes the height they release. Done, the title and the top row
  // stay. 1 = resting, 0 = typing.
  const reveal = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(reveal, {
      toValue: keyboardUp ? 0 : 1,
      duration: REVEAL_MS,
      useNativeDriver: false, // animating height, which the native driver can't
    }).start();
  }, [keyboardUp, reveal]);

  // Natural heights, measured so the collapse has somewhere to animate from.
  const [voiceRowHeight, setVoiceRowHeight] = useState(0);
  const [footerExtraHeight, setFooterExtraHeight] = useState(0);

  // Only accept a measurement while at rest. Once collapsed the wrapper is
  // 0-high with overflow hidden, and a re-fire there would overwrite the real
  // natural height with a squashed one — the row would then restore too short.
  const measureAtRest = (setter: (h: number) => void) => (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (!keyboardUp && h > 0) setter(h);
  };

  /**
   * Height for a collapsing wrapper.
   *
   * The unmeasured case is the one that matters. Returning `undefined` there
   * means "size normally", and since opacity collapses regardless, the element
   * goes invisible while still occupying its full height — which reads as dead
   * space between the page and the footer, and steals it from the flexing page.
   * So when there's no measurement yet, collapse to a hard 0 instead: it snaps
   * rather than animating on that first open, but it never leaves a gap.
   */
  const collapseTo = (natural: number) => {
    if (natural > 0) {
      return reveal.interpolate({ inputRange: [0, 1], outputRange: [0, natural] });
    }
    return keyboardUp ? 0 : undefined;
  };

  // the page flexes, so its height is measured rather than computed
  const [pageHeight, setPageHeight] = useState(0);

  // Rules must cover the taller of the page and the text, so a short entry
  // still gets a fully ruled page and a long one keeps them going as it scrolls.
  const [contentHeight, setContentHeight] = useState(0);
  const ruleCount = Math.ceil(Math.max(pageHeight, contentHeight) / RULE_SPACING);

  const hasEntry = entry.trim().length > 0;

  // TODO: starts a real recording once expo-av is wired; logs for now
  const recordVoiceNote = () => console.log('Record a voice note tapped');

  const handleDone = () => {
    if (hasEntry) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: real wiring (AsyncStorage / DayEntry) comes later
    console.log('Story', entry);
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

          {/* title — left-aligned like every other editor */}
          <Text style={styles.title}>Your day</Text>

          {/* middle — a plain View, not a ScrollView: the page flexes into
              whatever the voice row releases, and scrolls internally */}
          <View style={styles.middle}>
            {/* THE PAGE — flexes to fill; entry scrolls internally */}
            <View
              style={styles.page}
              onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
            >
              {/* Uniform full-height line, so scrolling it would look identical.
                  Left outside the scroll deliberately. */}
              <View style={styles.marginRule} pointerEvents="none" />

              <ScrollView
                style={styles.pageInner}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={(_width, height) => setContentHeight(height)}
              >
                {/* Rules live INSIDE the scrolled content, alongside the text,
                    so the paper moves as one object. As a fixed backdrop the
                    illusion broke the moment you scrolled. */}
                <View style={[styles.sheetOfPaper, { minHeight: pageHeight }]}>
                  {Array.from({ length: ruleCount }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.rule, { top: (i + 1) * RULE_SPACING }]}
                      pointerEvents="none"
                    />
                  ))}

                  {/* writing directly on the paper — no box, no border, no fill */}
                  <TextInput
                    style={styles.entry}
                    value={entry}
                    onChangeText={setEntry}
                    placeholder="What happened today?"
                    placeholderTextColor={W25}
                    selectionColor={w.accent}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled={false} // the page's ScrollView does the scrolling
                  />
                </View>
              </ScrollView>
            </View>

            {/* VOICE ROW — a quiet companion to the page, never an equal path.
                Collapses entirely while typing. */}
            <Animated.View
              style={[styles.collapsible, { opacity: reveal, height: collapseTo(voiceRowHeight) }]}
              pointerEvents={keyboardUp ? 'none' : 'auto'}
            >
              <View onLayout={measureAtRest(setVoiceRowHeight)}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={recordVoiceNote}
                  style={styles.voiceRow}
                >
                  <Ionicons name="mic-outline" size={18} color={W40} />
                  <Text style={styles.voiceLabel}>Record a voice note</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

          {/* footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />

            {/* completion line + dots — nothing to read while writing */}
            <Animated.View
              style={[styles.collapsible, { opacity: reveal, height: collapseTo(footerExtraHeight) }]}
              pointerEvents={keyboardUp ? 'none' : 'auto'}
            >
              <View onLayout={measureAtRest(setFooterExtraHeight)}>
                <Text style={styles.footerNote}>This becomes your day card</Text>
                <View style={styles.progressRow}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.progressDot, { backgroundColor: i < COMPLETED ? w.accent : palette.ringSubtle }]}
                    />
                  ))}
                  <Text style={styles.progressText}>This completes {COMPLETED} of 8 for today</Text>
                </View>
              </View>
            </Animated.View>

            <TouchableOpacity
              activeOpacity={hasEntry ? 0.85 : 1}
              onPress={hasEntry ? handleDone : undefined}
              style={[styles.doneButton, { backgroundColor: hasEntry ? w.accent : palette.hairline }]}
            >
              <Text style={[styles.doneButtonText, { color: hasEntry ? palette.textPrimary : W30 }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
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
  // fills the space between the fixed chrome and the pinned footer
  middle: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  // wrapper for anything that collapses away while typing
  collapsible: { overflow: 'hidden' },

  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  topDone: { fontFamily: w.fontMedium, fontSize: type.body.fontSize, color: w.accent },

  title: {
    marginTop: space.lg, // 20
    paddingHorizontal: space.xl,
    textAlign: 'left',
    fontFamily: w.fontMedium,
    fontSize: 22,
    color: palette.textPrimary,
  },

  // THE PAGE — treatment matched to SlideStory.tsx
  page: {
    flex: 1, // takes whatever the voice row and footer release while typing
    // a shade off the sheet so the page reads as paper laid on the surface
    backgroundColor: '#16233d',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  // horizontal rules — white at 8%. SlideStory still uses 4%, which reads as
  // nearly invisible on device; see the divergence note in 09_CODE_NOTES.
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.textPrimary,
    opacity: 0.08,
  },
  // vertical margin rule — muted red at 20%
  marginRule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: space.xl,
    width: 1,
    backgroundColor: palette.danger,
    opacity: 0.2,
  },
  pageInner: { flex: 1 },
  // the scrolled paper itself — rules and text are both its children, so they
  // move together. Padding lives here, not on the content container, so the
  // rules can be positioned relative to the same box the text sits in.
  sheetOfPaper: {
    position: 'relative',
    paddingLeft: space.xl + space.base,
    paddingRight: space.lg,
    paddingTop: PAGE_TOP_PADDING, // keeps line one in register with the rules
    paddingBottom: space.lg,
  },

  // DIEGETIC EXCEPTION #4 — serif, because this is your own writing, not UI.
  // Nothing else on this screen may use it. lineHeight matches RULE_SPACING so
  // the writing sits on the rules rather than drifting off them.
  entry: {
    fontFamily: fonts.mastheadBody, // Fraunces_400Regular
    fontSize: ENTRY_FONT_SIZE,
    lineHeight: RULE_SPACING,
    color: palette.textPrimary,
    opacity: 0.88,
    padding: 0, // no input box — you are writing on paper
  },

  // VOICE ROW — secondary by construction; total height stays under 48pt
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginTop: space.sm,
  },
  voiceLabel: {
    fontFamily: w.fontRegular,
    fontSize: 14,
    color: W40,
    marginLeft: space.sm,
  },

  // FOOTER
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
