import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { palette, space, type } from '@/constants/chronicleTheme';

const REVEAL_MS = 200;

type Props = {
  /** e.g. "This becomes your day card". */
  note: string;
  completed: number;
  total?: number;
  accent: string;
  fontFamily: string;
  /** true while the keyboard is up. */
  collapsed: boolean;
};

/**
 * The completion line + 8-dot row shared by every editor's footer. Collapses
 * to nothing while the keyboard is up — neither is useful mid-type and both
 * cost keyboard space — fading and shrinking away rather than just toggling
 * visibility, which would leave a dead gap above Done. Done itself is NOT
 * part of this component and must stay visible always.
 *
 * Ported from the collapse StoryEditor.tsx built for its own footer, pulled
 * into one place so all eight editors share the exact same behaviour instead
 * of re-implementing the same animation eight times.
 */
export default function EditorFooterProgress({
  note,
  completed,
  total = 8,
  accent,
  fontFamily,
  collapsed,
}: Props) {
  const reveal = useRef(new Animated.Value(collapsed ? 0 : 1)).current;
  // natural height, measured so the collapse has somewhere to animate from
  const [natural, setNatural] = useState(0);

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: collapsed ? 0 : 1,
      duration: REVEAL_MS,
      useNativeDriver: false, // animating height, which the native driver can't
    }).start();
  }, [collapsed, reveal]);

  // Only accept a measurement while expanded — a re-fire while collapsed (0-high,
  // overflow hidden) would overwrite the real natural height with a squashed one.
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (!collapsed && h > 0) setNatural(h);
  };

  // Unmeasured + collapsed must be a hard 0, not `undefined` — otherwise the
  // section goes invisible via opacity while still holding its full height,
  // which reads as a dead gap on the very first open.
  const height =
    natural > 0
      ? reveal.interpolate({ inputRange: [0, 1], outputRange: [0, natural] })
      : collapsed
      ? 0
      : undefined;

  return (
    <Animated.View
      style={[styles.collapsible, { opacity: reveal, height }]}
      pointerEvents={collapsed ? 'none' : 'auto'}
    >
      <View onLayout={onLayout}>
        <Text style={[styles.footerNote, { fontFamily }]}>{note}</Text>
        <View style={styles.progressRow}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[styles.progressDot, { backgroundColor: i < completed ? accent : palette.ringSubtle }]}
            />
          ))}
          <Text style={[styles.progressText, { fontFamily }]}>
            {completed} of {total} filled in today
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  collapsible: { overflow: 'hidden' },
  footerNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: type.label.fontSize,
    color: palette.textMuted,
  },
  progressRow: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  progressText: { marginLeft: 4, fontSize: type.label.fontSize, color: palette.textMuted },
});
