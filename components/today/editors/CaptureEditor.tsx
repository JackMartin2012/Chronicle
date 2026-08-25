import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

// ---- DEV ONLY — delete when this is wired to storage ----
// True fills both slots with placeholder gradients so the swap gesture and the
// mode-aware buttons can be exercised without taking photos.
const HAS_SAMPLE_PHOTOS = false;

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

  // TODO: local only — nothing is persisted yet. Captured file URIs by slot.
  const [photos, setPhotos] = useState<Record<Slot, string | null>>({
    main: null,
    selfie: null,
  });

  // a slot counts as filled by a real photo, or by the dev placeholder
  const filled: Record<Slot, boolean> = {
    main: HAS_SAMPLE_PHOTOS || photos.main !== null,
    selfie: HAS_SAMPLE_PHOTOS || photos.selfie !== null,
  };

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

  // ---- CAMERA ----
  // Permission is requested on first use, not on mount: opening an editor
  // should never fire a system prompt before you've asked for anything.
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraSlot, setCameraSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  // a shot awaiting accept/retake — nothing reaches the frame until it's
  // accepted. A selfie is one-shot; you need to see it before it becomes
  // your day.
  const [pending, setPending] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const capture = async (slot: Slot) => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        // denial is a state to explain, not an error to throw
        setPermissionBlocked(true);
        return;
      }
    }
    setPermissionBlocked(false);
    setCameraSlot(slot);
  };

  const closeCamera = () => {
    setCameraSlot(null);
    setPending(null);
  };

  // accept — the reviewed shot becomes the slot's photo
  const acceptPending = () => {
    if (!pending || !cameraSlot) return;
    setPhotos((prev) => ({ ...prev, [cameraSlot]: pending }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeCamera();
  };

  // retake — discard and drop straight back to the live camera, which never
  // unmounted, so there's no reopening delay
  const retakePending = () => setPending(null);

  const shoot = async () => {
    if (!cameraRef.current || !cameraSlot || busy) return;
    setBusy(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!shot?.uri) return;

      // NO EXPLICIT FLIP HERE — deliberately. See the note above `mirror` on
      // CameraView: in expo-camera 17 that prop un-mirrors the SAVED FILE as
      // well as mirroring the preview, so an ImageManipulator flip on top of it
      // applies a second time and the selfie comes out backwards. Verified on
      // device. Do not re-add one without re-testing against text.
      setPending(shot.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // a failed shot shouldn't strand the user in the camera
      console.warn('Capture failed', e);
      closeCamera();
    } finally {
      setBusy(false);
    }
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: real wiring (AsyncStorage / DayEntry) comes later
    console.log('Capture', photos);
    dismiss();
  };

  /**
   * A slot's contents: the real photo if one has been taken, the dev
   * placeholder if that's on, otherwise the empty capture affordance.
   * `resizeMode="cover"` is what keeps the 3:4 honest — the frame CROPS the
   * photo rather than stretching it to fit.
   */
  const renderSlot = (slot: Slot, variant: 'big' | 'inset') => {
    const uri = photos[slot];
    if (uri) {
      return <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
    }

    if (HAS_SAMPLE_PHOTOS) {
      return (
        <View style={styles.centerFill} pointerEvents="none">
          <LinearGradient
            colors={SAMPLE[slot].colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.sampleLabel}>{SAMPLE[slot].label}</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerFill} pointerEvents="none">
        <Ionicons name="camera-outline" size={variant === 'big' ? 32 : 18} color={W40} />
        {variant === 'big' && slot === 'main' && (
          <Text style={styles.framePrompt}>Take today&apos;s photo</Text>
        )}
        {variant === 'inset' && slot === 'selfie' && (
          <Text style={styles.insetSlotLabel}>You</Text>
        )}
      </View>
    );
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
              {renderSlot(bigSlot, 'big')}

              {/* empty → capture that slot; filled → swap which photo is large */}
              <Pressable
                onPress={
                  filled[insetSlot]
                    ? () => setSelfieIsBig((v) => !v)
                    : () => capture(insetSlot)
                }
                style={styles.selfieInset}
              >
                {renderSlot(insetSlot, 'inset')}
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
                  <Text style={styles.optionLabel}>
                    {photos.main ? 'Retake photo' : 'Take a photo'}
                  </Text>
                </TouchableOpacity>
                {/* TODO: pass two — the camera roll picker, filtered to today */}
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
                  <Text style={styles.optionLabel}>
                    {photos.selfie ? 'Retake selfie' : 'Take a selfie'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* denial is a state to explain quietly, not a dead button */}
            {permissionBlocked && (
              <Text style={styles.permissionNote}>
                Chronicle needs camera access to take today&apos;s photo. You can turn it
                on in Settings.
              </Text>
            )}
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

      {/* THE CAMERA — in-app CameraView, never ImagePicker.launchCameraAsync:
          the native iOS confirmation screen inverts the image. Nested here in
          the parent's JSX rather than raised as an independent modal. */}
      <Modal
        visible={cameraSlot !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeCamera}
      >
        <View style={styles.cameraRoot}>
          {cameraSlot && (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={cameraSlot === 'selfie' ? 'front' : 'back'}
              // Mirrors the preview so shooting yourself feels like a mirror,
              // AND un-mirrors the saved file so text reads correctly later.
              // Verified on device: this one prop does both, which is why
              // shoot() must NOT also flip — see the note there.
              mirror={cameraSlot === 'selfie'}
            />
          )}

          {pending ? (
            /* REVIEW — our own screen, never the native iOS confirmation
               screen (rule 7): that's the thing that inverts images. The
               CameraView stays mounted underneath so Retake is instant. */
            <View style={StyleSheet.absoluteFill}>
              <Image
                source={{ uri: pending }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />

              <View style={[styles.reviewRow, { paddingBottom: insets.bottom + space.xl }]}>
                <TouchableOpacity onPress={retakePending} hitSlop={12} activeOpacity={0.7}>
                  <Text style={styles.reviewRetake}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={acceptPending} activeOpacity={0.85}>
                  <View style={styles.reviewAccept}>
                    <Ionicons name="checkmark" size={32} color={palette.textPrimary} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.cameraTopRow, { paddingTop: insets.top + space.sm }]}>
                <TouchableOpacity onPress={closeCamera} hitSlop={12}>
                  <Ionicons name="close" size={28} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.cameraLabel}>
                  {cameraSlot === 'selfie' ? 'You' : 'Your day'}
                </Text>
                {/* balances the row so the label stays centred */}
                <View style={styles.cameraTopSpacer} />
              </View>

              <View style={[styles.cameraBottomRow, { paddingBottom: insets.bottom + space.xl }]}>
                <TouchableOpacity
                  onPress={shoot}
                  disabled={busy}
                  activeOpacity={0.8}
                  style={styles.shutterOuter}
                >
                  <View style={styles.shutterInner}>
                    {busy && <ActivityIndicator color={palette.presentBg} />}
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
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
  permissionNote: {
    marginTop: space.base,
    textAlign: 'center',
    fontFamily: w.fontRegular,
    fontSize: type.label.fontSize,
    lineHeight: 18,
    color: W40,
  },

  // THE CAMERA
  cameraRoot: { flex: 1, backgroundColor: '#000000' },
  cameraTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraLabel: {
    fontFamily: w.fontMedium,
    fontSize: type.body.fontSize,
    color: palette.textPrimary,
  },
  cameraTopSpacer: { width: 28 },
  cameraBottomRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: palette.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // REVIEW — the photo is the hero, so only two controls sit on it
  reviewRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewRetake: {
    fontFamily: w.fontRegular,
    fontSize: type.body.fontSize,
    color: palette.textPrimary,
    // a legible shadow instead of a chip, so nothing boxes the photo off
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reviewAccept: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: w.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
