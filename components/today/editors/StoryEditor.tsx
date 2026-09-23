import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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

import {
  getWorld,
  palette,
  radius,
  space,
  STORY_ENTRY_FONT,
  STORY_ENTRY_FONT_SIZE,
  STORY_RULE_OPACITY,
  STORY_RULE_SPACING,
  type,
} from '@/constants/chronicleTheme';
import EditorFooterProgress from '../EditorFooterProgress';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';
import { countFilledInputs, formatDateKey, loadDayEntry, saveDayEntry } from '@/lib/dayEntry';
import { deleteFileIfPresent, documentPath, persistFile, voiceNoteFileName } from '@/lib/media';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.78);

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W40 = 'rgba(255,255,255,0.4)';
const W25 = 'rgba(255,255,255,0.25)';
const BACKDROP = 'rgba(0,0,0,0.55)';


// ---- the page ----
// Matched to SlideStory.tsx so the editor and the day card are visibly the same
// object: same rule spacing, same faint white rules, same muted-red margin rule.
// The entry's lineHeight equals STORY_RULE_SPACING so the writing sits ON the rules.

// The text's top padding MUST be a multiple of STORY_RULE_SPACING. The rules are drawn
// at (i+1) * STORY_RULE_SPACING, so any other value puts every line half a rule out of
// register and the first rule cuts through the opening line.
const PAGE_TOP_PADDING = STORY_RULE_SPACING;

const REVEAL_MS = 200;

// persistFile, deleteFileIfPresent and the filename conventions live in
// lib/media.ts — CaptureEditor needs them too.

// ---- the voice row ----
// 04 warns that this is easy to lose by making the player too tall. All three
// states are pinned to the SAME 44pt height — well under the 56pt ceiling — so
// the row can never grow into a second hero, and switching state shifts nothing.
const VOICE_ROW_HEIGHT = 44;

const WAVE_BARS = 28;
const WAVE_MIN_BAR = 3;
const WAVE_MAX_BAR = 18;

// expo-av reports loudness in dBFS: -160 is silence, 0 is maximum. Anything
// below -60 is effectively room tone, so that's the floor for a visible bar.
const METERING_FLOOR = -60;

const meteringToBar = (metering?: number) => {
  if (metering === undefined) return WAVE_MIN_BAR;
  const level = Math.max(0, Math.min(1, (metering - METERING_FLOOR) / -METERING_FLOOR));
  return WAVE_MIN_BAR + level * (WAVE_MAX_BAR - WAVE_MIN_BAR);
};

const formatDuration = (millis: number) => {
  const total = Math.floor(millis / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

type VoiceState = 'resting' | 'recording' | 'recorded';

// Fixed-height strip of level bars. Pads to a constant bar count so the row's
// width and height never shift as levels arrive.
function Waveform({ bars, live = false }: { bars: number[]; live?: boolean }) {
  const padded =
    bars.length >= WAVE_BARS
      ? bars.slice(bars.length - WAVE_BARS)
      : [...Array(WAVE_BARS - bars.length).fill(WAVE_MIN_BAR), ...bars];

  return (
    <View style={styles.wave}>
      {padded.map((h, i) => (
        <View
          key={i}
          style={[
            styles.waveBar,
            { height: h, backgroundColor: live ? w.accent : palette.textMuted },
          ]}
        />
      ))}
    </View>
  );
}

export default function StoryEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  const [entry, setEntry] = useState('');
  const [completed, setCompleted] = useState(0);

  // Seed from today's record so reopening shows the page you wrote, and the
  // voice note you attached to it.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      setEntry(day.story.text);
      if (day.story.voiceNoteUri) {
        setVoiceUri(day.story.voiceNoteUri);
        setElapsed(day.story.voiceNoteDuration);
        setVoiceState('recorded');
      }
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);

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

  // declared up here because the collapse behaviour below depends on it
  const [voiceState, setVoiceState] = useState<VoiceState>('resting');
  const isRecording = voiceState === 'recording';

  // While typing, nothing but the page is doing any work: the voice row, the
  // completion line and the dots all collapse and fade, and the page — which
  // flexes — takes the height they release. Done, the title and the top row
  // stay. 1 = resting, 0 = typing.
  //
  // AN ACTIVE RECORDING OVERRIDES THIS for the voice row. Recording invisibly
  // with no stop control is how you end up with a twenty-minute file you didn't
  // know about. Typing while recording is rare — if you're reading your entry
  // aloud the text already exists — so the writing space is the right thing to
  // trade for an always-visible stop. The footer still collapses either way.
  const hideVoiceRow = keyboardUp && !isRecording;

  const voiceReveal = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(voiceReveal, {
      toValue: hideVoiceRow ? 0 : 1,
      duration: REVEAL_MS,
      useNativeDriver: false,
    }).start();
  }, [hideVoiceRow, voiceReveal]);

  // Natural height, measured so the collapse has somewhere to animate from.
  const [voiceRowHeight, setVoiceRowHeight] = useState(0);

  // Only accept a measurement while the wrapper is EXPANDED. Once collapsed it
  // is 0-high with overflow hidden, and a re-fire there would overwrite the
  // real natural height with a squashed one — the row would restore too short.
  const measureWhenOpen =
    (setter: (h: number) => void, collapsed: boolean) => (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (!collapsed && h > 0) setter(h);
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
  const collapseTo = (value: Animated.Value, natural: number, collapsed: boolean) => {
    if (natural > 0) {
      return value.interpolate({ inputRange: [0, 1], outputRange: [0, natural] });
    }
    return collapsed ? 0 : undefined;
  };

  // the page flexes, so its height is measured rather than computed
  const [pageHeight, setPageHeight] = useState(0);

  // Rules must cover the taller of the page and the text, so a short entry
  // still gets a fully ruled page and a long one keeps them going as it scrolls.
  const [contentHeight, setContentHeight] = useState(0);
  const ruleCount = Math.ceil(Math.max(pageHeight, contentHeight) / STORY_RULE_SPACING);

  const hasEntry = entry.trim().length > 0;

  // ---- VOICE ----
  // expo-av, deliberately: it's deprecated in SDK 54 but the expo-audio
  // migration is deferred project-wide. Do not migrate this in isolation.
  //
  // The recording is a COMPANION to the page, never a replacement. Nothing here
  // touches `entry` — a day can be written, spoken, or both.
  // voiceState is declared further up — the collapse behaviour depends on it
  const [micBlocked, setMicBlocked] = useState(false);
  const [wave, setWave] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // release the mic and the player if the editor closes mid-recording
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    try {
      // permission on first tap, never on mount
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setMicBlocked(true);
        return;
      }
      setMicBlocked(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setWave([]);
      setElapsed(0);

      const { recording } = await Audio.Recording.createAsync(
        // HIGH_QUALITY already sets isMeteringEnabled, which is what feeds the
        // live waveform — the bars are real levels, not a decorative loop
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (!status.isRecording) return;
          setElapsed(status.durationMillis);
          setWave((prev) => {
            const next = [...prev, meteringToBar(status.metering)];
            return next.length > WAVE_BARS ? next.slice(next.length - WAVE_BARS) : next;
          });
        },
        100 // ~10 bars a second
      );

      recordingRef.current = recording;
      setVoiceState('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.warn('Could not start recording', e);
      setVoiceState('resting');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      // hand the route back to the speaker — left on, iOS keeps playback in
      // the earpiece and the note sounds broken
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (uri) {
        setVoiceUri(uri);
        setVoiceState('recorded');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setVoiceState('resting');
      }
    } catch (e) {
      console.warn('Could not stop recording', e);
      setVoiceState('resting');
    }
  };

  const togglePlayback = async () => {
    if (!voiceUri) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.replayAsync();
          setIsPlaying(true);
        }
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceUri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) setIsPlaying(false);
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (e) {
      console.warn('Could not play the voice note', e);
    }
  };

  const deleteVoiceNote = async () => {
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;

    const dateKey = formatDateKey(new Date());

    // delete the FILE, not just the reference — both the recording currently
    // held (which may still be the cache copy) and any copy already saved
    deleteFileIfPresent(voiceUri);
    deleteFileIfPresent(documentPath(voiceNoteFileName(dateKey)));

    // clear it in storage too. Without this, closing the sheet after a delete
    // would leave the record pointing at a file that no longer exists. The
    // partial merge means the page text is untouched.
    saveDayEntry(dateKey, { story: { voiceNoteUri: '', voiceNoteDuration: 0 } });

    setVoiceUri(null);
    setIsPlaying(false);
    setWave([]);
    setElapsed(0);
    setVoiceState('resting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDone = () => {
    if (hasEntry) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dateKey = formatDateKey(new Date());

    // copy the recording out of the cache before recording where it is. A
    // failed copy stores no voice note rather than a path to a missing file.
    const persistedVoiceUri = voiceUri
      ? persistFile(voiceUri, voiceNoteFileName(dateKey))
      : null;

    // text and voice go together — they coexist, so saving one without the
    // other would read as the other having been cleared
    saveDayEntry(dateKey, {
      story: {
        text: entry,
        voiceNoteUri: persistedVoiceUri ?? '',
        voiceNoteDuration: persistedVoiceUri ? elapsed : 0,
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
                      style={[styles.rule, { top: (i + 1) * STORY_RULE_SPACING }]}
                      pointerEvents="none"
                    />
                  ))}

                  {/* writing directly on the paper — no box, no border, no fill */}
                  <TextInput
                    inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
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
              style={[
                styles.collapsible,
                {
                  opacity: voiceReveal,
                  height: collapseTo(voiceReveal, voiceRowHeight, hideVoiceRow),
                },
              ]}
              pointerEvents={hideVoiceRow ? 'none' : 'auto'}
            >
              <View onLayout={measureWhenOpen(setVoiceRowHeight, hideVoiceRow)}>
                {voiceState === 'resting' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={startRecording}
                    style={styles.voiceRow}
                  >
                    <Ionicons name="mic-outline" size={18} color={W40} />
                    <Text style={styles.voiceLabel}>Record a voice note</Text>
                  </TouchableOpacity>
                )}

                {voiceState === 'recording' && (
                  <View style={styles.voiceRow}>
                    <TouchableOpacity
                      onPress={stopRecording}
                      hitSlop={10}
                      activeOpacity={0.8}
                      style={styles.voiceStop}
                    >
                      <View style={styles.voiceStopSquare} />
                    </TouchableOpacity>
                    <Waveform bars={wave} live />
                    <Text style={styles.voiceTimer}>{formatDuration(elapsed)}</Text>
                  </View>
                )}

                {voiceState === 'recorded' && (
                  <View style={styles.voiceRow}>
                    <TouchableOpacity onPress={togglePlayback} hitSlop={10} activeOpacity={0.8}>
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={20}
                        color={w.accent}
                      />
                    </TouchableOpacity>
                    <Waveform bars={wave} />
                    <Text style={styles.voiceTimer}>{formatDuration(elapsed)}</Text>
                    <TouchableOpacity
                      onPress={deleteVoiceNote}
                      hitSlop={10}
                      activeOpacity={0.7}
                      style={styles.voiceDelete}
                    >
                      <Ionicons name="trash-outline" size={16} color={W40} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* denial is a state to explain quietly, not a dead control */}
                {micBlocked && (
                  <Text style={styles.micNote}>
                    Chronicle needs microphone access to record a voice note. You can
                    turn it on in Settings.
                  </Text>
                )}
              </View>
            </Animated.View>
          </View>

          {/* footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />

            <EditorFooterProgress
              note="This becomes your day card"
              completed={completed}
              accent={w.accent}
              fontFamily={w.fontRegular}
              collapsed={keyboardUp}
            />

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
  // horizontal rules — shared with SlideStory (STORY_RULE_OPACITY)
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.textPrimary,
    opacity: STORY_RULE_OPACITY,
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
  // Nothing else on this screen may use it. lineHeight matches STORY_RULE_SPACING so
  // the writing sits on the rules rather than drifting off them.
  entry: {
    fontFamily: STORY_ENTRY_FONT('present'),
    fontSize: STORY_ENTRY_FONT_SIZE,
    lineHeight: STORY_RULE_SPACING,
    color: palette.textPrimary,
    opacity: 0.88,
    padding: 0, // no input box — you are writing on paper
  },

  // VOICE ROW — secondary by construction. Every state is the SAME height, so
  // the companion can never grow into a second hero (04's specific warning).
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: VOICE_ROW_HEIGHT,
    marginTop: space.sm,
  },
  voiceLabel: {
    fontFamily: w.fontRegular,
    fontSize: 14,
    color: W40,
    marginLeft: space.sm,
  },

  // recording
  voiceStop: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceStopSquare: {
    width: 9,
    height: 9,
    borderRadius: 1.5,
    backgroundColor: palette.danger,
  },

  // shared strip
  wave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: WAVE_MAX_BAR,
    marginHorizontal: space.md,
  },
  waveBar: { width: 2, borderRadius: 1 },
  voiceTimer: {
    fontFamily: w.fontRegular,
    fontSize: type.caption.fontSize,
    color: W40,
    minWidth: 34, // stops the row twitching as the timer ticks past 0:09
    textAlign: 'right',
  },
  voiceDelete: { marginLeft: space.md },

  micNote: {
    fontFamily: w.fontRegular,
    fontSize: type.caption.fontSize,
    lineHeight: 16,
    color: W40,
    marginTop: space.xs,
  },

  // FOOTER
  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline, marginTop: space.lg },
});
