import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorld, palette, space, type } from '@/constants/chronicleTheme';

const w = getWorld('present');
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.9); // photo-dominant, like PlacesEditor at 92%

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W40 = 'rgba(255,255,255,0.4)';
const W20 = 'rgba(255,255,255,0.2)';
const W15 = 'rgba(255,255,255,0.15)';
const BACKDROP = 'rgba(0,0,0,0.55)';

const COMPLETED = 3; // TODO: real day-progress count comes with wiring

// ---- the hero pair ----
// The frame takes a WIDTH and derives its height from aspectRatio 3/4. The
// width is capped two ways: never wider than full-bleed (screen minus 24pt each
// side), and never so wide that the derived height pushes the buttons off
// screen — a full-bleed 345pt frame would be 460pt tall, which doesn't fit
// above the controls even in a 90% sheet.
const MAX_FRAME_WIDTH = SCREEN_W - 24 * 2;

// everything in the middle that isn't the frame: top/bottom padding plus the
// button row. Subtracted from the measured height to cap the frame's WIDTH, so
// the frame never has to be told a height.
const CONTROLS_BLOCK = 100;

// first-paint estimate, corrected by onLayout on the very next frame
const ESTIMATED_MIDDLE = SHEET_HEIGHT - 100 - 186; // chrome ≈ 100, footer ≈ 186

// The two frames must read as separate objects — a photo with something sitting
// ON it, not one continuous shape. Same tone for both was the reason they
// merged visually.
const MAIN_FILL = '#16233d';
const INSET_FILL = '#24344f';

const MODE_FADE_MS = 180;

type Slot = 'main' | 'selfie';

// ---- DEV ONLY — delete when the camera is wired ----
// Flip to false to check the empty state. True fills both slots so the swap
// gesture and the mode-aware buttons can actually be exercised.
const HAS_SAMPLE_PHOTOS = true;

// Stand-ins for the real photos: fixed-size gradients, both cool-toned so
// nothing reads as a debug colour. Distinguishable by hue — the main slot is
// blue, the selfie greyer slate. Never Image components — one that fails to
// load collapses the frame and the layout can't be judged.
const SAMPLE: Record<Slot, { colors: [string, string]; label: string }> = {
  main: { colors: ['#1e3050', '#31527a'], label: 'your day' },
  selfie: { colors: ['#2b3a44', '#47606f'], label: 'you' },
};

// One button of the pair, so the lone "Take a selfie" keeps that width when
// it's centred rather than stretching or sitting off to one side.
const SINGLE_BUTTON_WIDTH = (SCREEN_W - 24 * 2 - space.md) / 2;

export default function CaptureEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  // which source fills the big frame vs the corner inset. Same shape as
  // SlideCapture's swap — it lives inline in that slide rather than in a
  // shared helper, and pulling it out would mean editing the slide, so this
  // mirrors it exactly instead of inventing a second interaction.
  const [selfieIsBig, setSelfieIsBig] = useState(false);

  // TODO: driven by real photos once the camera is wired. Until then the dev
  // const above decides — an empty slot is a capture affordance, a filled one
  // takes part in the swap.
  const [filled] = useState<Record<Slot, boolean>>({
    main: HAS_SAMPLE_PHOTOS,
    selfie: HAS_SAMPLE_PHOTOS,
  });

  const bigSlot: Slot = selfieIsBig ? 'selfie' : 'main';
  const insetSlot: Slot = selfieIsBig ? 'main' : 'selfie';

  // The frame is given a WIDTH only; aspectRatio 3/4 derives its height, and
  // flexGrow/flexShrink 0 stop the column from adjusting it. The width is
  // capped so the derived height still leaves the buttons on screen.
  const [middleHeight, setMiddleHeight] = useState(ESTIMATED_MIDDLE);
  const frameWidth = Math.max(
    0,
    Math.min(MAX_FRAME_WIDTH, ((middleHeight - CONTROLS_BLOCK) * 3) / 4)
  );

  // cross-fade the button row when the large photo changes: 0 = main, 1 = selfie
  const modeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(modeAnim, {
      toValue: selfieIsBig ? 1 : 0,
      duration: MODE_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [selfieIsBig, modeAnim]);

  const mainControlsOpacity = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // TODO: opens the camera once this is wired; logs the slot for now
  const capture = (slot: Slot) => console.log('Capture tapped', slot);

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: real wiring (AsyncStorage / DayEntry) comes later
    console.log('Capture', { selfieIsBig, filled });
    dismiss();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
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
          <Text style={styles.title}>Capture today</Text>

          {/* middle */}
          <ScrollView
            style={styles.middle}
            contentContainerStyle={styles.middleContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onLayout={(e) => setMiddleHeight(e.nativeEvent.layout.height)}
          >
            {/* THE HERO — the BeReal pair, the one dominant object */}
            <Pressable
              // an empty frame is the capture affordance; a filled one is just
              // the photo, and only the inset swaps
              onPress={filled[bigSlot] ? undefined : () => capture(bigSlot)}
              style={[styles.frame, { width: frameWidth }]}
            >
              {filled[bigSlot] ? (
                <View style={styles.centerFill} pointerEvents="none">
                  <LinearGradient
                    colors={SAMPLE[bigSlot].colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.sampleLabel}>{SAMPLE[bigSlot].label}</Text>
                </View>
              ) : (
                <View style={styles.centerFill} pointerEvents="none">
                  <Ionicons name="camera-outline" size={32} color={W40} />
                  {bigSlot === 'main' && (
                    <Text style={styles.framePrompt}>Take today&apos;s photo</Text>
                  )}
                </View>
              )}

              {/* empty → capture that slot; filled → swap which photo is large */}
              <Pressable
                onPress={
                  filled[insetSlot]
                    ? () => setSelfieIsBig((v) => !v)
                    : () => capture(insetSlot)
                }
                style={styles.selfieInset}
              >
                {filled[insetSlot] ? (
                  <View style={styles.centerFill} pointerEvents="none">
                    <LinearGradient
                      colors={SAMPLE[insetSlot].colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.sampleLabel}>{SAMPLE[insetSlot].label}</Text>
                  </View>
                ) : (
                  <View style={styles.centerFill} pointerEvents="none">
                    <Ionicons name="camera-outline" size={18} color={W40} />
                    {insetSlot === 'selfie' && <Text style={styles.insetSlotLabel}>You</Text>}
                  </View>
                )}
              </Pressable>
            </Pressable>

            {/* QUIET CONTROLS — outlined, no fill, so they sit under the hero.
                They follow whichever photo is currently large: the day's photo
                usually already exists in the camera roll, the selfie is an
                in-app ritual and so is camera-only. */}
            <View style={styles.optionRowWrap}>
              {/* main photo large — shoot it or pull it from today */}
              <Animated.View
                style={[styles.optionLayer, { opacity: mainControlsOpacity }]}
                pointerEvents={selfieIsBig ? 'none' : 'auto'}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.option}
                  onPress={() => capture('main')}
                >
                  <Text style={styles.optionLabel}>Take a photo</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} style={styles.option}>
                  <Text style={styles.optionLabel}>Choose from today</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* selfie large — one button, held to a single button's width */}
              <Animated.View
                style={[styles.optionLayer, styles.optionLayerSingle, { opacity: modeAnim }]}
                pointerEvents={selfieIsBig ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.option, styles.optionSingle]}
                  onPress={() => capture('selfie')}
                >
                  <Text style={styles.optionLabel}>Take a selfie</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>

          {/* footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerNote}>This becomes your day card cover</Text>
            <View style={styles.progressRow}>
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={i}
                  style={[styles.progressDot, { backgroundColor: i < COMPLETED ? w.accent : palette.ringSubtle }]}
                />
              ))}
              <Text style={styles.progressText}>This completes {COMPLETED} of 8 for today</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDone}
              style={[styles.doneButton, { backgroundColor: w.accent }]}
            >
              <Text style={[styles.doneButtonText, { color: palette.textPrimary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: w.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },

  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: w.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetInner: { flex: 1 },
  middle: { flex: 1 }, // fills the space between the fixed chrome and the pinned footer
  middleContent: { paddingHorizontal: 24, paddingTop: space.lg, paddingBottom: space.lg, alignItems: 'center' },

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
  topDone: { fontFamily: w.fontMedium, fontSize: type.body.fontSize, color: w.accent },

  title: {
    marginTop: space.lg, // 20
    paddingHorizontal: space.xl,
    textAlign: 'left',
    fontFamily: w.fontMedium,
    fontSize: 22,
    color: palette.textPrimary,
  },

  // HERO — width is passed in; aspectRatio derives the height. flexGrow/Shrink
  // 0 so the surrounding column can never stretch or squash the ratio.
  frame: {
    aspectRatio: 3 / 4,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: MAIN_FILL,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  selfieInset: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 96,
    height: 128,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: w.surface, // the sheet colour — cuts the inset out of the photo
    backgroundColor: INSET_FILL,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  centerFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  framePrompt: {
    marginTop: space.sm,
    fontFamily: w.fontRegular,
    fontSize: 15,
    color: W40,
  },
  insetSlotLabel: { marginTop: 2, fontFamily: w.fontRegular, fontSize: 11, color: W40 },
  // dev-only label on the sample fills
  sampleLabel: { fontFamily: w.fontRegular, fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  // QUIET CONTROLS — both mode layers stack in one fixed-height row so the
  // cross-fade doesn't shift anything above or below it
  // stretch, or centring the column would shrink the row to its content width
  optionRowWrap: { alignSelf: 'stretch', marginTop: space.lg, height: 40 },
  optionLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    gap: space.md,
  },
  option: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: W15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // lone button: centred, held to exactly one pair-button's width
  optionLayerSingle: { justifyContent: 'center' },
  optionSingle: { flex: 0, width: SINGLE_BUTTON_WIDTH },
  optionLabel: { fontFamily: w.fontRegular, fontSize: 15, color: palette.textPrimary },

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
