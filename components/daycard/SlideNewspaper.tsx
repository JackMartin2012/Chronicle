import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, getWorld, palette, space, type } from '@/constants/chronicleTheme';
import type { SavedHeadline } from '@/lib/newsStore';

// derive an rgba from a hex accent token so we can use it at partial opacity
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
  newspaper: {
    lead?: SavedHeadline;
    others: SavedHeadline[];
    otherNews: string;
  };
};

const dateline = (date: Date) => {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday} ${date.getDate()} ${month} ${date.getFullYear()}`;
};

// Slide 8 — "Beyond today". A physical newspaper page, DARK (white ink on
// blue-black), text only — no photo block. Diegetic exception: masthead +
// headlines use the serif (Fraunces) even in the Present world — it's part
// of the newspaper object. Sourced from the News editor's saved picks
// (lib/newsStore.ts), not the Wikipedia on-this-day archive (see
// lib/dayCardData.ts). Chrome from carousel. Tapping a story does nothing yet.
export default function SlideNewspaper({ world, date, newspaper }: Props) {
  const w = getWorld(world);
  const { lead, others, otherNews } = newspaper;
  const hasOtherNews = otherNews.trim().length > 0;

  return (
    <ScrollView style={[styles.root, { backgroundColor: w.bg }]} contentContainerStyle={styles.content}>
      {/* MASTHEAD */}
      <View style={styles.ruleThick} />
      <Text style={[styles.masthead, { fontFamily: fonts.masthead }]}>Chronicle</Text>
      <View style={styles.ruleThin} />
      <View style={styles.mastheadMeta}>
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>{dateline(date)}</Text>
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>The world today</Text>
      </View>

      {/* LEAD STORY */}
      {lead && (
        <>
          <Text style={[styles.headline, { fontFamily: fonts.masthead }]} numberOfLines={4}>
            {lead.title}
          </Text>
          <Text style={[styles.source, { fontFamily: w.fontRegular }]}>{lead.domain}</Text>

          {lead.comment.trim().length > 0 && (
            <View style={[styles.quote, { borderLeftColor: withAlpha(w.accent, 0.3) }]}>
              <Text style={[styles.quoteText, { fontFamily: w.fontRegular }]}>“{lead.comment.trim()}”</Text>
            </View>
          )}
        </>
      )}

      {/* OTHER SELECTED STORIES */}
      {others.length > 0 && (
        <>
          {lead && <View style={[styles.ruleThin, { marginVertical: space.lg }]} />}
          {others.map((story, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.ruleThin, { marginVertical: space.md }]} />}
              <Text style={[styles.otherHeadline, { fontFamily: fonts.masthead }]} numberOfLines={3}>
                {story.title}
              </Text>
              <Text style={[styles.source, { fontFamily: w.fontRegular }]}>{story.domain}</Text>
              {story.comment.trim().length > 0 && (
                <Text style={[styles.otherComment, { fontFamily: w.fontRegular }]}>“{story.comment.trim()}”</Text>
              )}
            </View>
          ))}
        </>
      )}

      {/* IN OTHER NEWS */}
      {hasOtherNews && (
        <>
          <View style={[styles.ruleThick, { marginVertical: space.lg }]} />
          <Text style={[styles.sectionHeading, { fontFamily: fonts.mastheadBody }]}>In other news</Text>
          <Text style={[styles.otherNewsText, { fontFamily: w.fontRegular }]}>{otherNews.trim()}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: space.screenX, paddingTop: space.lg, paddingBottom: space.xxxl },

  // rules — white ink at two weights
  ruleThick: { height: 2.5, backgroundColor: palette.textPrimary, opacity: 0.4 },
  ruleThin: { height: 1, backgroundColor: palette.textPrimary, opacity: 0.2 },

  // MASTHEAD
  masthead: {
    ...type.statFigure,
    color: palette.textPrimary,
    textAlign: 'center',
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  mastheadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  metaText: { ...type.micro, color: palette.textMuted },

  // LEAD STORY — text only, no photo block
  headline: { ...type.headline, color: palette.textPrimary, marginTop: space.lg },
  source: { ...type.micro, color: palette.textMuted, marginTop: space.xs },

  quote: {
    borderLeftWidth: 2,
    paddingLeft: space.md,
    marginTop: space.md,
  },
  quoteText: {
    ...type.body,
    fontStyle: 'italic',
    color: palette.textPrimary,
    opacity: 0.85,
  },

  // OTHER SELECTED STORIES
  otherHeadline: { ...type.bodySmall, color: palette.textPrimary },
  otherComment: {
    ...type.caption,
    fontStyle: 'italic',
    color: palette.textSecondary,
    marginTop: space.xs,
  },

  // IN OTHER NEWS
  sectionHeading: { ...type.caption, color: palette.textSecondary, marginBottom: space.sm },
  otherNewsText: { ...type.body, color: palette.textPrimary, opacity: 0.85 },
});
