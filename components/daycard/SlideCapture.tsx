import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_W - space.screenX * 2;
const PHOTO_HEIGHT = 560;

type Props = {
  world: 'past' | 'present';
  captureTime?: string;
};

// Slide 2 — BeReal layout. All plain coloured Views (no Image that can fail to
// load and collapse). Two gestures:
//   • tap the selfie inset  → swap which block fills the frame  (inner Pressable)
//   • press-and-hold the photo → peek: hide the inset while held (outer Pressable)
// Chrome comes from DayCardCarousel.
export default function SlideCapture({ world, captureTime }: Props) {
  const w = getWorld(world);

  // which source occupies the big frame vs the corner inset
  const [selfieIsBig, setSelfieIsBig] = useState(false);
  // press-and-hold the background to peek — hides the inset while held
  const [peeking, setPeeking] = useState(false);

  // TODO: real photo sources; solid colour blocks + test labels for now.
  const back = { label: 'BACK', color: w.surface };
  const selfie = { label: 'SELFIE', color: palette.ringSubtle }; // lighter tone
  const big = selfieIsBig ? selfie : back;
  const inset = selfieIsBig ? back : selfie;

  return (
    <View style={styles.root}>
      <View style={styles.group}>
        {/* MAIN PHOTO — hold to peek */}
        <Pressable
          onPressIn={() => setPeeking(true)}
          onPressOut={() => setPeeking(false)}
          style={[styles.photo, { backgroundColor: big.color }]}
        >
          <View style={styles.centerFill} pointerEvents="none">
            <Text style={[styles.blockLabel, { fontFamily: w.fontRegular }]}>{big.label}</Text>
          </View>

          {/* SELFIE INSET — tap to swap; hidden (opacity 0) while peeking */}
          <Pressable
            onPress={() => setSelfieIsBig((v) => !v)}
            style={[styles.selfie, { backgroundColor: inset.color, opacity: peeking ? 0 : 1 }]}
          >
            <View style={styles.centerFill} pointerEvents="none">
              <Text style={[styles.blockLabel, { fontFamily: w.fontRegular }]}>{inset.label}</Text>
            </View>
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

  centerFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockLabel: { ...type.caption, color: palette.textMuted },

  // quiet caption directly beneath the photo, left-aligned
  caption: {
    ...type.caption,
    color: palette.textSecondary,
    marginTop: space.md,
  },
});
