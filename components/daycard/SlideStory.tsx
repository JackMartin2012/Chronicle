import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

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

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_HEIGHT = Math.round(SCREEN_H * 0.55); // fixed journal panel
const RULE_COUNT = Math.ceil(PANEL_HEIGHT / STORY_RULE_SPACING); // rules fill only the panel

// derive an rgba from a world accent token so we can use it at partial opacity
// without fading a whole element (keeps us off hardcoded colours)
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  world: 'past' | 'present';
  date: Date;
  text: string;
  voiceNoteUri: string;
  /** milliseconds; 0 when there's no recording */
  voiceNoteDuration: number;
  learned: string;
  people: { name: string; photoUri?: string }[];
};

const formatDuration = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// grey waveform bar heights (24 bars) — the only non-text element on the page
const WAVE = [5, 9, 14, 7, 11, 17, 8, 6, 12, 16, 10, 7, 13, 18, 9, 5, 11, 15, 8, 12, 6, 14, 9, 7];

// Slide 5 — "Your day". The slide itself does not scroll. A fixed-height ruled
// journal panel (its entry scrolls internally if long; voice note pinned at the
// bottom), then an always-visible "Something I learned" note. Chrome from carousel.
export default function SlideStory({
  world,
  date,
  text,
  voiceNoteUri,
  voiceNoteDuration,
  learned,
  people,
}: Props) {
  const w = getWorld(world);
  const dateLabel = `${date.toLocaleDateString('en-GB', { weekday: 'long' })} ${date.getDate()} ${date.toLocaleDateString('en-GB', { month: 'long' })}`;
  const names = people.map((p) => p.name.trim()).filter((n) => n.length > 0);

  // render the entry with linked names inline (accent Text, no-op onPress for now)
  const renderEntry = () => {
    // no names -> no regex (an empty alternation would match everywhere)
    if (names.length === 0) return text;
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
    return text.split(re).map((part, i) =>
      names.includes(part) ? (
        <Text key={i} style={{ color: w.accent }} onPress={() => {}}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  return (
    <View style={styles.root}>
      {/* THE JOURNAL PANEL — fixed height; only its text scrolls */}
      <View style={[styles.panel, { backgroundColor: w.surface }]}>
        {/* faint horizontal rules */}
        {Array.from({ length: RULE_COUNT }).map((_, i) => (
          <View key={i} style={[styles.rule, { top: (i + 1) * STORY_RULE_SPACING }]} pointerEvents="none" />
        ))}
        {/* muted-red vertical margin rule near the left */}
        <View style={styles.marginRule} pointerEvents="none" />

        {/* content to the right of the margin rule */}
        <View style={styles.inner}>
          {/* scrollable entry — scrolls internally only if it overflows the panel */}
          <ScrollView style={styles.entryScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.letterhead, { fontFamily: w.fontRegular }]}>{dateLabel}</Text>
            <Text style={[styles.entry, { fontFamily: STORY_ENTRY_FONT(world) }]}>{renderEntry()}</Text>
          </ScrollView>

          {/* voice note pinned at the bottom of the panel, below the text */}
          {!!voiceNoteUri && (
            <View style={styles.voiceRow}>
              <Ionicons name="play" size={16} color={w.accent} />
              <View style={styles.wave}>
                {WAVE.map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: h }]} />
                ))}
              </View>
              <Text style={[styles.voiceTime, { fontFamily: w.fontRegular }]}>{formatDuration(voiceNoteDuration)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* SOMETHING I LEARNED — below the panel; hidden entirely when nothing was learned */}
      {learned.trim().length > 0 && (
        <View style={styles.learnedSection}>
          <View style={styles.learnedLabelRow}>
            <Ionicons name="bulb-outline" size={18} color={w.accent} />
            <Text style={[styles.learnedLabel, { fontFamily: w.fontRegular }]}>Something I learned</Text>
          </View>

          <View style={[styles.note, { backgroundColor: w.surface, borderColor: withAlpha(w.accent, 0.2) }]}>
            <Text style={[styles.noteText, { fontFamily: w.fontRegular }]}>{learned}</Text>
          </View>

          <Text style={[styles.savedNote, { fontFamily: w.fontRegular }]}>Saved to your things learned</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.base, paddingTop: space.base },

  // fixed-height panel; rules/margin rule fill only this
  panel: {
    height: PANEL_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },

  // faint horizontal rules — shared STORY_RULE_OPACITY
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.textPrimary,
    opacity: STORY_RULE_OPACITY,
  },
  // vertical margin rule — muted red at 20% (danger token + opacity)
  marginRule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: space.xl,
    width: 1,
    backgroundColor: palette.danger,
    opacity: 0.2,
  },

  // fills the panel; column of scrollable text + pinned voice memo
  inner: {
    flex: 1,
    paddingLeft: space.xl + space.base,
    paddingRight: space.lg,
    paddingVertical: space.lg,
  },
  entryScroll: { flex: 1 },

  letterhead: { ...type.caption, color: palette.textMuted, marginBottom: space.md },

  // continuous writing, sitting on the rules (lineHeight matches STORY_RULE_SPACING)
  entry: {
    fontSize: STORY_ENTRY_FONT_SIZE,
    lineHeight: STORY_RULE_SPACING,
    color: palette.textPrimary,
    opacity: 0.88,
  },

  voiceRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  wave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 20,
    marginHorizontal: space.md,
  },
  waveBar: { width: 2, borderRadius: 1, backgroundColor: palette.textMuted },
  voiceTime: { ...type.caption, color: palette.textMuted },

  // SOMETHING I LEARNED — distinct from the journal panel
  learnedSection: { marginTop: space.lg },
  learnedLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  learnedLabel: { ...type.caption, color: palette.textMuted, marginLeft: space.xs },
  note: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.base,
  },
  noteText: { ...type.body, color: palette.textPrimary },
  savedNote: { ...type.micro, color: palette.textMuted, marginTop: space.sm },
});
