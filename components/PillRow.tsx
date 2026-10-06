import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Overrides the default content padding/gap — e.g. { paddingHorizontal: 0 }
   * when the parent already provides its own side padding (see
   * explore.tsx's "Add a Favourite" category row). */
  contentStyle?: ViewStyle;
};

/**
 * A horizontal strip of pills/chips — category filters, quick tags, and the
 * like. Two things every such row needs, that are easy to get wrong one at a
 * time:
 *
 * 1. `flexGrow: 0` on the ScrollView itself, so it sizes to its own content
 *    instead of stretching to fill its parent's height. This is the exact bug
 *    already fixed once in SlideCameraRoll.tsx's thumbnail strip.
 * 2. No `maxHeight` guess on top of that. explore.tsx's Favourites filter
 *    pills had `maxHeight: 54`, just short of what a pill's actual rendered
 *    height (text line height + the pill's own vertical padding + this row's
 *    vertical padding) needed — clipping the bottom of the text (Oct 2026).
 *    flexGrow: 0 alone already sizes the strip correctly; there's no pixel
 *    budget left to get wrong by adding a height cap on top of it.
 *
 * This only owns the ROW's structure (the ScrollView + its content padding).
 * Callers render their own pill components as children, so each screen keeps
 * its own pill colours/active-state styling.
 */
export default function PillRow({ children, contentStyle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0 },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center', // keeps pills of slightly different heights from clipping against each other
  },
});
