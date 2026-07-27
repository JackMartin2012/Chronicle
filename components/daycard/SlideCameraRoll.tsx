import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, getWorld, palette, radius, sizes, space, type } from '@/constants/chronicleTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const POLAROID_WIDTH = Math.round(SCREEN_W * 0.72); // enlarged from sizes.polaroid (0.65)
const PHOTO_SIZE = POLAROID_WIDTH - space.sm * 2; // frame's inner width (thin side padding)

type PhotoItem = { time: string; caption?: string; isVideo?: boolean };

// TODO: real camera-roll items; solid colour blocks + sample metadata for now.
const PHOTOS: PhotoItem[] = [
  { time: '08:12', caption: 'first coffee' },
  { time: '10:45', caption: 'the long way round' },
  { time: '11:30', caption: 'the river', isVideo: true },
  { time: '13:05', caption: 'lunch in the sun' },
  { time: '14:20' },
  { time: '16:40', isVideo: true },
  { time: '18:04', caption: 'golden hour' },
  { time: '21:15', caption: 'back home' },
];

const SUMMARY = '12 photos · 2 videos';

type Props = {
  world: 'past' | 'present';
};

// Slide 3 — "Your camera roll". A featured polaroid over a horizontal thumbnail
// strip. All photos are solid colour blocks for now. Chrome comes from
// DayCardCarousel; only the strip scrolls (horizontally).
export default function SlideCameraRoll({ world }: Props) {
  const w = getWorld(world);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featured = PHOTOS[featuredIndex];

  return (
    <View style={styles.root}>
      {/* 1. THE POLAROID */}
      <View style={styles.frame}>
        {/* TODO: real photo; solid placeholder block */}
        <View style={[styles.photo, { backgroundColor: w.surface }]}>
          {featured.isVideo && (
            <View style={styles.centerFill} pointerEvents="none">
              <Ionicons name="play" size={48} color={palette.textPrimary} />
            </View>
          )}
        </View>

        <View style={styles.captionArea}>
          <Text style={[styles.time, { fontFamily: w.fontRegular }]}>{featured.time}</Text>
          {featured.caption ? (
            <Text style={[styles.handwritten, { fontFamily: fonts.handwriting }]}>
              {featured.caption}
            </Text>
          ) : null}
        </View>
      </View>

      {/* 2. THE THUMBNAIL STRIP (only this scrolls, horizontally) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {PHOTOS.map((item, i) => {
          const active = i === featuredIndex;
          return (
            <Pressable
              key={i}
              onPress={() => setFeaturedIndex(i)}
              style={[
                styles.thumb,
                { backgroundColor: w.surface },
                active ? { borderWidth: 2, borderColor: w.accent } : styles.thumbInactive,
              ]}
            >
              {item.isVideo && (
                <View style={styles.centerFill} pointerEvents="none">
                  <Ionicons name="play" size={14} color={palette.textPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 3. SUMMARY */}
      <Text style={[styles.summary, { fontFamily: w.fontRegular }]}>{SUMMARY}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // centre the whole group vertically in the available space
  root: { flex: 1, justifyContent: 'center' },

  // 1. polaroid — thin top/sides, thick bottom margin holding the caption
  frame: {
    alignSelf: 'center',
    width: POLAROID_WIDTH,
    backgroundColor: palette.polaroidFrame,
    borderRadius: radius.sm,
    paddingTop: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    paddingBottom: space.xxl,
    shadowColor: '#000', // spec: black print shadow
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  captionArea: { marginTop: space.md },
  time: { ...type.caption, color: palette.polaroidInk },
  handwritten: { ...type.headline, color: palette.polaroidInk, marginTop: space.xs },

  // 2. thumbnail strip — flexGrow:0 stops a horizontal ScrollView from
  // expanding to fill the parent's height (which broke vertical centring)
  strip: { marginTop: space.lg, flexGrow: 0 },
  stripContent: { paddingHorizontal: space.screenX },
  thumb: {
    width: sizes.thumbnail,
    height: sizes.thumbnail,
    borderRadius: radius.sm,
    marginRight: space.sm,
  },
  thumbInactive: { opacity: 0.5 },

  // 3. summary
  summary: {
    ...type.caption,
    color: palette.textMuted,
    marginTop: space.md,
    alignSelf: 'center',
  },

  centerFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
