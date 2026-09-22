import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_W - space.screenX * 2;
const PHOTO_HEIGHT = 560;

type Props = {
  world: 'past' | 'present';
  captureTime?: string;
  mainPhotoUri: string;
  selfieUri: string;
  /** Which of the pair filled the big frame when this was saved — seeds the local swap state. */
  selfieIsBig: boolean;
};

// Slide 2 — BeReal layout. Two gestures, only when BOTH photos exist:
//   • tap the selfie inset  → swap which block fills the frame  (inner Pressable)
//   • press-and-hold the photo → peek: hide the inset while held (outer Pressable)
// With only one photo, it renders full-bleed alone — nothing to swap or peek at.
// Chrome comes from DayCardCarousel.
export default function SlideCapture({ world, captureTime, mainPhotoUri, selfieUri, selfieIsBig: selfieIsBigProp }: Props) {
  const w = getWorld(world);

  const hasBoth = !!mainPhotoUri && !!selfieUri;

  // which source occupies the big frame vs the corner inset — seeded from the
  // saved value on mount, then a local override for the rest of the session
  // (tap-swap doesn't write back to storage from here).
  const [selfieIsBig, setSelfieIsBig] = useState(selfieIsBigProp);
  useEffect(() => {
    setSelfieIsBig(selfieIsBigProp);
  }, [selfieIsBigProp]);

  // press-and-hold the background to peek — hides the inset while held
  const [peeking, setPeeking] = useState(false);

  if (!hasBoth) {
    // exactly one of the two exists (the upstream gate guarantees at least
    // one) — full-bleed, no swap/peek chrome since there's nothing to swap to
    const soloUri = mainPhotoUri || selfieUri;
    return (
      <View style={styles.root}>
        <View style={styles.group}>
          <View style={styles.photo}>
            <Image source={{ uri: soloUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
          <Text style={[styles.caption, { fontFamily: w.fontRegular }]}>
            Captured {captureTime}
          </Text>
        </View>
      </View>
    );
  }

  const big = selfieIsBig ? selfieUri : mainPhotoUri;
  const inset = selfieIsBig ? mainPhotoUri : selfieUri;

  return (
    <View style={styles.root}>
      <View style={styles.group}>
        {/* MAIN PHOTO — hold to peek */}
        <Pressable
          onPressIn={() => setPeeking(true)}
          onPressOut={() => setPeeking(false)}
          style={styles.photo}
        >
          <Image source={{ uri: big }} style={StyleSheet.absoluteFill} resizeMode="cover" />

          {/* SELFIE INSET — tap to swap; hidden (opacity 0) while peeking */}
          <Pressable
            onPress={() => setSelfieIsBig((v) => !v)}
            style={[styles.selfie, { opacity: peeking ? 0 : 1 }]}
          >
            <Image source={{ uri: inset }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </Pressable>
        </Pressable>

        {/* CAPTION */}
        <Text style={[styles.caption, { fontFamily: w.fontRegular }]}>
          Captured {captureTime}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // centre the photo + caption group in the available space
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // group is exactly the photo width so the caption left-aligns to the photo
  group: { width: PHOTO_WIDTH },

  // dominant back-camera photo — explicit size so it always renders
  photo: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: radius.hero,
    position: 'relative',
    overflow: 'hidden',
  },

  // large BeReal selfie inset, portrait, top-left, overlapping the photo
  selfie: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 130,
    height: 170,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: '#0a0a0a', // near-black, per spec
    overflow: 'hidden',
  },

  // quiet caption directly beneath the photo, left-aligned
  caption: {
    ...type.caption,
    color: palette.textSecondary,
    marginTop: space.md,
  },
});
