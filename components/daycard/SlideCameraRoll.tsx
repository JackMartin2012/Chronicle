import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, getWorld, palette, radius, sizes, space, type } from '@/constants/chronicleTheme';
import type { CameraRollItem } from '@/lib/dayCardData';

const { width: SCREEN_W } = Dimensions.get('window');
const POLAROID_WIDTH = Math.round(SCREEN_W * 0.72); // enlarged from sizes.polaroid (0.65)
const PHOTO_SIZE = POLAROID_WIDTH - space.sm * 2; // frame's inner width (thin side padding)

const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

type Props = {
  world: 'past' | 'present';
  /** Oldest → newest, hidden photos already filtered out (see dayCardExtras). */
  items: CameraRollItem[];
  /** today_thumbnail_${dateKey} — the asset id chosen in the Camera Roll editor, if any. */
  chosenThumbnailId: string | null;
  /** caption_${assetId}, keyed by id. Missing/empty means no caption line. */
  captions: Record<string, string>;
  photoCount: number;
  videoCount: number;
};

// Slide 3 — "Your camera roll". A featured polaroid over a horizontal thumbnail
// strip. Chrome comes from DayCardCarousel; only the strip scrolls (horizontally).
export default function SlideCameraRoll({ world, items, chosenThumbnailId, captions, photoCount, videoCount }: Props) {
  const w = getWorld(world);

  // Same default-selection rule as CameraRollEditor: the day's chosen thumbnail
  // if it's still here, otherwise the most recent item (items are oldest-first).
  const initialIndex = (() => {
    if (chosenThumbnailId) {
      const idx = items.findIndex((it) => it.id === chosenThumbnailId);
      if (idx !== -1) return idx;
    }
    return items.length - 1;
  })();
  const [featuredIndex, setFeaturedIndex] = useState(initialIndex);
  const featured = items[featuredIndex];
  const featuredCaption = featured ? captions[featured.id] : undefined;

  if (!featured) return null; // the carousel only builds this slide when there's at least one item

  return (
    <View style={styles.root}>
      {/* 1. THE POLAROID */}
      <View style={styles.frame}>
        <View style={[styles.photo, { backgroundColor: w.surface }]}>
          {featured.kind === 'photo' ? (
            <Image source={{ uri: featured.uri }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <View style={styles.centerFill} pointerEvents="none">
              <Ionicons name="play" size={48} color={palette.textPrimary} />
            </View>
          )}
        </View>

        <View style={styles.captionArea}>
          <Text style={[styles.time, { fontFamily: w.fontRegular }]}>{clockTime(featured.takenAt)}</Text>
          {featuredCaption ? (
            <Text style={[styles.handwritten, { fontFamily: fonts.handwriting }]}>
              {featuredCaption}
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
        {items.map((item, i) => {
          const active = i === featuredIndex;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFeaturedIndex(i)}
              style={[
                styles.thumb,
                { backgroundColor: w.surface },
                active ? { borderWidth: 2, borderColor: w.accent } : styles.thumbInactive,
              ]}
            >
              {item.kind === 'photo' ? (
                <Image source={{ uri: item.uri }} style={styles.thumbImage} resizeMode="cover" />
              ) : (
                <View style={styles.centerFill} pointerEvents="none">
                  <Ionicons name="play" size={14} color={palette.textPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 3. SUMMARY */}
      <Text style={[styles.summary, { fontFamily: w.fontRegular }]}>
        {plural(photoCount, 'photo')} · {plural(videoCount, 'video')}
      </Text>
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
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
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
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
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
