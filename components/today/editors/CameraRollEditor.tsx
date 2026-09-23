import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
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

import { getWorld, palette, radius, sizes, space, type } from '@/constants/chronicleTheme';
import { formatDateKey } from '@/lib/dayEntry';
import { queryAllCameraRoll } from '@/lib/dayCardExtras';
import type { CameraRollItem } from '@/lib/dayCardData';
import {
  hidePhoto,
  loadCaptions,
  loadFavouritedPhotos,
  loadHiddenPhotos,
  loadTodayThumbnail,
  saveCaption,
  saveTodayThumbnail,
  toggleFavouritedPhoto,
} from '@/lib/photoStore';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';

const w = getWorld('present');
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const W60 = 'rgba(255,255,255,0.6)';
const W50 = 'rgba(255,255,255,0.5)';
const W20 = 'rgba(255,255,255,0.2)';
const INPUT_BG = '#16233d';
const BACKDROP = 'rgba(0,0,0,0.55)';
const MENU_BG = 'rgba(12,20,36,0.96)';
const BUTTON_BG = 'rgba(0,0,0,0.55)';

const PHOTO_SIZE = Math.min(SCREEN_W - space.xl * 2, 340); // large view is square
const PHOTO_SIZE_TYPING_MIN = 100; // the smallest the photo gets while typing

const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const durationLabel = (secs?: number) => {
  if (!secs) return '';
  const total = Math.round(secs);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Camera Roll editor — every photo and video from today. Not one of the original
// eight editors (it doesn't count toward the day's progress), but it wears the
// same chrome. Everything saves the moment you do it, so Done only closes.
export default function CameraRollEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dateKey = formatDateKey(new Date());

  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [status, setStatus] = useState<'loading' | 'ready' | 'blocked' | 'error'>('loading');
  const [items, setItems] = useState<CameraRollItem[]>([]); // non-hidden, oldest → newest
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [favourited, setFavourited] = useState<string[]>([]);
  const [thumbnailId, setThumbnailId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false); // photos only — no video playback yet

  // ---- load: permission → uncapped query → drop hidden → seed selection ----
  useEffect(() => {
    if (!permission) return; // still asking the OS
    let active = true;
    (async () => {
      let granted = permission.granted;
      if (!granted && permission.canAskAgain) {
        granted = (await requestPermission()).granted;
        if (!active) return; // the hook's state changed; the effect re-runs with the new answer
      }
      if (!granted) {
        if (active) setStatus('blocked');
        return;
      }
      try {
        const [roll, hidden, favs, thumb] = await Promise.all([
          queryAllCameraRoll(dateKey),
          loadHiddenPhotos(),
          loadFavouritedPhotos(),
          loadTodayThumbnail(dateKey),
        ]);
        if (!active) return;
        if (roll.status !== 'granted') {
          setStatus('blocked');
          return;
        }
        const visible = roll.items.filter((it) => !hidden.includes(it.id));
        const caps = await loadCaptions(visible.map((it) => it.id));
        if (!active) return;
        setItems(visible);
        setCaptions(caps);
        setFavourited(favs);
        setThumbnailId(thumb);
        // the day's chosen thumbnail if it's still here, otherwise the most recent
        const start = visible.find((it) => it.id === thumb) ?? visible[visible.length - 1];
        setSelectedId(start ? start.id : null);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted, permission?.canAskAgain, !!permission]);

  const selected = items.find((it) => it.id === selectedId) ?? null;

  // ---- captions: saved the moment you leave the field, switch photo, or close ----
  const dirtyCaptionFor = useRef<string | null>(null);
  const captionsRef = useRef(captions);
  captionsRef.current = captions;

  const flushCaption = async () => {
    const id = dirtyCaptionFor.current;
    if (!id) return;
    dirtyCaptionFor.current = null;
    await saveCaption(id, (captionsRef.current[id] ?? '').trim());
  };

  // closing by any route (backdrop, the Modal's own back gesture) still saves a pending caption
  const flushRef = useRef(flushCaption);
  flushRef.current = flushCaption;
  useEffect(() => () => void flushRef.current(), []);

  const onCaptionChange = (text: string) => {
    if (!selected) return;
    dirtyCaptionFor.current = selected.id;
    setCaptions((prev) => ({ ...prev, [selected.id]: text }));
  };

  const select = (id: string) => {
    if (id === selectedId) return;
    flushCaption();
    setMenuOpen(false);
    setFullscreenOpen(false);
    setSelectedId(id);
  };

  const dismiss = () => {
    Keyboard.dismiss();
    flushCaption();
    onClose?.();
  };

  // ---- the three-dot menu ----
  // Hiding is effectively permanent (there's no un-hide screen), so it always asks first.
  const confirmHide = () => {
    setMenuOpen(false);
    Alert.alert('Hide this photo?', 'Are you sure? This photo will never be shown again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', style: 'destructive', onPress: doHide },
    ]);
  };

  const doHide = async () => {
    if (!selected) return;
    await flushCaption();
    await hidePhoto(selected.id);
    const idx = items.findIndex((it) => it.id === selected.id);
    const remaining = items.filter((it) => it.id !== selected.id);
    // next item in time order, or the one before if that was the last
    const next = remaining[idx] ?? remaining[idx - 1] ?? null;
    setItems(remaining);
    setSelectedId(next ? next.id : null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const doSetThumbnail = async () => {
    if (!selected) return;
    setMenuOpen(false);
    await saveTodayThumbnail(dateKey, selected.id);
    setThumbnailId(selected.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const doFavourite = async () => {
    if (!selected) return;
    setMenuOpen(false);
    setFavourited(await toggleFavouritedPhoto(selected.id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ---- keyboard: the sheet's bottom sits on it (same approach as the other editors) ----
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const keyboardUp = keyboardHeight > 0;
  const restHeight = Math.min(Math.round(SCREEN_H * 0.92), SCREEN_H - insets.top - space.sm);
  const sheetHeight = keyboardUp
    ? Math.min(restHeight, SCREEN_H - keyboardHeight - insets.top - space.sm)
    : restHeight;
  // With the keyboard up the strip is gone, so the photo takes everything the
  // caption doesn't need: the visible body, minus the time line, the caption box
  // (which grows as you type) and the gaps between them. Measured, not guessed.
  // bodyH is only recorded while the keyboard is up, so it always holds the *typing*
  // viewport height — the photo never sizes itself from the tall, keyboard-down one.
  const [bodyH, setBodyH] = useState(0);
  const [metaH, setMetaH] = useState(0);
  const [captionH, setCaptionH] = useState(0);
  const photoSize = keyboardUp
    ? bodyH > 0
      ? Math.max(
          PHOTO_SIZE_TYPING_MIN,
          Math.min(PHOTO_SIZE, bodyH - space.lg /* content bottom pad */ - (space.sm + metaH) - (space.md + captionH) - space.sm /* slack */)
        )
      : PHOTO_SIZE_TYPING_MIN
    : PHOTO_SIZE;

  const isFav = selected ? favourited.includes(selected.id) : false;
  const isThumb = selected ? thumbnailId === selected.id : false;

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
          <View style={styles.grabber} />

          <View style={styles.topRow}>
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={W60} />
            </TouchableOpacity>
            {/* nothing to save in a batch — every action above already saved itself */}
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Text style={styles.topDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Today&apos;s photos &amp; videos</Text>

          {status === 'loading' && (
            <View style={styles.centred}>
              <Text style={styles.stateText}>Loading today&apos;s camera roll…</Text>
            </View>
          )}
          {status === 'blocked' && (
            <View style={styles.centred}>
              <Ionicons name="images-outline" size={32} color={palette.ringSubtle} />
              <Text style={styles.stateText}>Chronicle needs access to your photos to show today&apos;s.</Text>
              <Text style={styles.stateSub}>You can allow it in Settings → Chronicle → Photos.</Text>
            </View>
          )}
          {status === 'error' && (
            <View style={styles.centred}>
              <Text style={styles.stateText}>Couldn&apos;t load today&apos;s photos.</Text>
            </View>
          )}
          {status === 'ready' && !selected && (
            <View style={styles.centred}>
              <Ionicons name="images-outline" size={32} color={palette.ringSubtle} />
              <Text style={styles.stateText}>
                {items.length === 0 ? 'No photos or videos from today yet.' : 'Nothing left to show.'}
              </Text>
            </View>
          )}

          {status === 'ready' && selected && (
            <ScrollView
              style={styles.body}
              onLayout={(e) => {
                if (keyboardUp) setBodyH(e.nativeEvent.layout.height);
              }}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* LARGE PHOTO / VIDEO — with the menu button in its own top-right corner */}
              <View style={[styles.photoBox, { width: photoSize, height: photoSize }]}>
                {selected.kind === 'photo' ? (
                  <Pressable style={styles.fill} onPress={() => setFullscreenOpen(true)}>
                    <Image source={{ uri: selected.uri }} style={styles.fill} resizeMode="cover" />
                  </Pressable>
                ) : (
                  <View style={[styles.fill, styles.videoBlock]}>
                    <Ionicons name="play" size={48} color={palette.textPrimary} />
                  </View>
                )}

                {/* small status badges, bottom-left */}
                <View style={styles.badges} pointerEvents="none">
                  {isThumb && (
                    <View style={styles.badge}>
                      <Ionicons name="image" size={12} color={palette.textPrimary} />
                    </View>
                  )}
                  {isFav && (
                    <View style={styles.badge}>
                      <Ionicons name="star" size={12} color={palette.textPrimary} />
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setMenuOpen((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel="Photo options"
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={palette.textPrimary} />
                </TouchableOpacity>

                {menuOpen && (
                  <>
                    {/* tap anywhere else on the photo to dismiss */}
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
                    <View style={styles.menu}>
                      <MenuRow icon="eye-off-outline" label="Hide" onPress={confirmHide} />
                      <MenuRow
                        icon={isThumb ? 'checkmark-circle' : 'image-outline'}
                        label={isThumb ? 'Day thumbnail' : 'Set as thumbnail'}
                        onPress={doSetThumbnail}
                      />
                      <MenuRow
                        icon={isFav ? 'star' : 'star-outline'}
                        label={isFav ? 'Unfavourite' : 'Favourite'}
                        onPress={doFavourite}
                        last
                      />
                    </View>
                  </>
                )}
              </View>

              <Text style={styles.meta} onLayout={(e) => setMetaH(e.nativeEvent.layout.height)}>
                {clockTime(selected.takenAt)}
                {selected.kind === 'video' && selected.durationSec ? `  ·  Video ${durationLabel(selected.durationSec)}` : ''}
              </Text>

              {/* CAPTION — saves to caption_${assetId} when you leave the field */}
              <View style={styles.captionWrap} onLayout={(e) => setCaptionH(e.nativeEvent.layout.height)}>
              {/* Local "hide keyboard" button. The shared KeyboardDismissBar (InputAccessoryView)
                  didn't work on this specific screen — investigated Sept 2026, cause not found
                  (see 09_CODE_NOTES.md). This is a local workaround, NOT the shared pattern.
                  Only shown while the keyboard is up; it just calls Keyboard.dismiss(). */}
              {keyboardUp && (
              <TouchableOpacity
                style={styles.hideKeyboardBtn}
                onPress={Keyboard.dismiss}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Hide keyboard"
              >
                <Ionicons name="chevron-down" size={22} color={W60} />
              </TouchableOpacity>
              )}
              <View style={styles.captionBox}>
                <TextInput
                  inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                  style={styles.captionInput}
                  value={captions[selected.id] ?? ''}
                  onChangeText={onCaptionChange}
                  onBlur={flushCaption}
                  placeholder="Add a caption…"
                  placeholderTextColor={palette.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              </View>

              {/* THUMBNAIL STRIP — everything from today, in time order. Hidden while the
                  keyboard is up (it would only show half-cut behind the caption). */}
              {!keyboardUp && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.strip}
                contentContainerStyle={styles.stripContent}
                keyboardShouldPersistTaps="handled"
              >
                {items.map((it) => {
                  const active = it.id === selected.id;
                  return (
                    <Pressable
                      key={it.id}
                      onPress={() => select(it.id)}
                      style={[
                        styles.thumb,
                        active ? { borderWidth: 2, borderColor: w.accent } : styles.thumbInactive,
                      ]}
                    >
                      {it.kind === 'photo' ? (
                        <Image source={{ uri: it.uri }} style={styles.fill} resizeMode="cover" />
                      ) : (
                        <View style={[styles.fill, styles.videoBlock]}>
                          <Ionicons name="play" size={14} color={palette.textPrimary} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
              )}
            </ScrollView>
          )}
        </Pressable>
      </View>
      <KeyboardDismissBar />

      {/* FULL-SCREEN PHOTO — nested in this editor's tree (no stacked modals). Tap anywhere to close.
          Only in the tree while open, so nothing extra sits beside KeyboardDismissBar the rest of the time. */}
      {fullscreenOpen && selected?.kind === 'photo' && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFullscreenOpen(false)}>
          <TouchableOpacity style={styles.fullscreenOverlay} activeOpacity={1} onPress={() => setFullscreenOpen(false)}>
            <Image source={{ uri: selected.uri }} style={styles.fullscreenImage} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuRow, !last && styles.menuRowDivider]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={palette.textPrimary} />
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: w.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },

  sheet: { backgroundColor: w.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
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

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  stateText: { marginTop: space.md, fontFamily: w.fontRegular, fontSize: 14, color: W50, textAlign: 'center' },
  stateSub: { marginTop: space.xs, fontFamily: w.fontRegular, fontSize: 12, color: W50, textAlign: 'center' },

  body: { flex: 1, marginTop: space.md },
  bodyContent: { alignItems: 'center', paddingBottom: space.lg },

  // large photo
  photoBox: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: INPUT_BG,
  },
  fill: { width: '100%', height: '100%' },
  videoBlock: { alignItems: 'center', justifyContent: 'center', backgroundColor: INPUT_BG },
  menuButton: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BUTTON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    top: space.sm + 34 + space.xs,
    right: space.sm,
    minWidth: 190,
    borderRadius: radius.md,
    backgroundColor: MENU_BG,
    overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: space.base },
  menuRowDivider: { borderBottomWidth: 1, borderBottomColor: palette.hairline },
  menuLabel: { marginLeft: space.md, fontFamily: w.fontRegular, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },
  badges: { position: 'absolute', left: space.sm, bottom: space.sm, flexDirection: 'row' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: space.xs,
    backgroundColor: BUTTON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  meta: { marginTop: space.sm, fontFamily: w.fontRegular, fontSize: type.caption.fontSize, color: W50 },

  // caption
  captionWrap: { alignSelf: 'stretch', marginTop: space.md },
  // right-aligned chevron, sized and coloured like the shared bar's button (44pt target)
  hideKeyboardBtn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 32,
    marginRight: space.xl - 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionBox: {
    alignSelf: 'stretch',
    marginHorizontal: space.xl,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    overflow: 'hidden',
  },
  // starts at one line and grows with the text (up to ~5 lines); the padding lives on
  // the input itself so a tap anywhere in the box lands on it
  captionInput: {
    minHeight: 48,
    maxHeight: 120,
    padding: 14,
    fontFamily: w.fontRegular,
    fontSize: type.body.fontSize,
    color: palette.textPrimary,
  },

  // full-screen viewer
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },

  // strip
  strip: { alignSelf: 'stretch', marginTop: space.lg, flexGrow: 0 },
  stripContent: { paddingHorizontal: space.xl },
  thumb: {
    width: sizes.thumbnail,
    height: sizes.thumbnail,
    borderRadius: radius.sm,
    marginRight: space.sm,
    overflow: 'hidden',
    backgroundColor: INPUT_BG,
  },
  thumbInactive: { opacity: 0.5 },
});
