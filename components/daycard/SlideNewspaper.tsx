import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, getWorld, palette, space, type } from '@/constants/chronicleTheme';
import type { OnThisDayFact, SavedHeadline } from '@/lib/newsStore';
import { topicLabel } from '@/lib/newsStore';

type Props = {
  world: 'past' | 'present';
  date: Date;
  newspaper: {
    lead?: SavedHeadline;
    others: SavedHeadline[];
    otherNews: string;
    onThisDay: OnThisDayFact[];
  };
};

const dateline = (date: Date) => {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday} ${date.getDate()} ${month} ${date.getFullYear()}`;
};

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

// Slide 8 — "Beyond today". An old-fashioned front page: one sheet of cream
// newsprint sitting inside the slide's normal navy (w.bg) — see `sheet` below
// — ink-black text, thick/thin black rules, text only — no photo block (yet).
// Masthead is the blackletter font even in the Present world — diegetic, part
// of the newspaper object. Sourced from the News editor's saved picks
// (lib/newsStore.ts). Tapping a story does nothing yet.
export default function SlideNewspaper({ world, date, newspaper }: Props) {
  const w = getWorld(world);
  const { lead, others, otherNews, onThisDay } = newspaper;
  const hasOtherNews = otherNews.trim().length > 0;
  const hasOnThisDay = onThisDay.length > 0;

  // Tap-to-expand — a cut-off headline (lead, or any of `others` by index)
  // shows its full sentence on tap; tapping again collapses it back.
  const [leadExpanded, setLeadExpanded] = useState(false);
  const [othersExpanded, setOthersExpanded] = useState<Record<number, boolean>>({});

  const renderComment = (comment: string) =>
    comment.trim().length > 0 && (
      <View style={[styles.quote, { borderLeftColor: palette.newsprintInk }]}>
        <Text style={[styles.quoteText, { fontFamily: fonts.mastheadQuote }]}>“{comment.trim()}”</Text>
      </View>
    );

  return (
    <View style={[styles.root, { backgroundColor: w.bg }]}>
      <View style={styles.sheet}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* MASTHEAD */}
          <View style={styles.ruleThick} />
          <Text style={[styles.masthead, { fontFamily: fonts.mastheadTitle }]}>The Daily Chronicle</Text>
          <View style={styles.ruleThin} />
          <View style={styles.mastheadMeta}>
            <Text style={[styles.metaText, { fontFamily: w.fontMedium }]}>{dateline(date).toUpperCase()}</Text>
            <Text style={[styles.metaText, { fontFamily: w.fontMedium }]}>THE WORLD TODAY</Text>
          </View>

          {/* LEAD STORY */}
          {lead && (
            <>
              {topicLabel(lead.category) && (
                <Text style={[styles.topicLabel, { fontFamily: w.fontMedium }]}>{topicLabel(lead.category)}</Text>
              )}
              <Pressable onPress={() => setLeadExpanded((e) => !e)} hitSlop={HIT}>
                <Text
                  style={[styles.headline, { fontFamily: fonts.masthead }]}
                  numberOfLines={leadExpanded ? undefined : 4}
                >
                  {lead.title}
                </Text>
              </Pressable>
              <Text style={[styles.source, { fontFamily: w.fontRegular }]}>{lead.domain}</Text>
              {renderComment(lead.comment)}
            </>
          )}

          {/* OTHER SELECTED STORIES */}
          {others.length > 0 && (
            <>
              {lead && <View style={[styles.ruleThin, { marginVertical: space.lg }]} />}
              {others.map((story, i) => {
                const label = topicLabel(story.category);
                return (
                  <View key={i}>
                    {i > 0 && <View style={[styles.ruleThin, { marginVertical: space.md }]} />}
                    {label && <Text style={[styles.topicLabel, { fontFamily: w.fontMedium }]}>{label}</Text>}
                    <Pressable
                      onPress={() => setOthersExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                      hitSlop={HIT}
                    >
                      <Text
                        style={[styles.otherHeadline, { fontFamily: fonts.masthead }]}
                        numberOfLines={othersExpanded[i] ? undefined : 3}
                      >
                        {story.title}
                      </Text>
                    </Pressable>
                    <Text style={[styles.source, { fontFamily: w.fontRegular }]}>{story.domain}</Text>
                    {renderComment(story.comment)}
                  </View>
                );
              })}
            </>
          )}

          {/* ON THIS DAY */}
          {hasOnThisDay && (
            <>
              <View style={[styles.ruleThick, { marginVertical: space.lg }]} />
              <Text style={styles.sectionHeading}>On this day</Text>
              {onThisDay.map((fact, i) => (
                <View key={i}>
                  {i > 0 && <View style={[styles.ruleThin, { marginVertical: space.md }]} />}
                  <Text style={[styles.factHeading, { fontFamily: w.fontBold }]}>On this day in {fact.year}</Text>
                  <Text style={[styles.bodyText, { fontFamily: w.fontRegular }]}>{fact.text}</Text>
                </View>
              ))}
            </>
          )}

          {/* IN OTHER NEWS */}
          {hasOtherNews && (
            <>
              <View style={[styles.ruleThick, { marginVertical: space.lg }]} />
              <Text style={styles.sectionHeading}>In other news</Text>
              <Text style={[styles.bodyText, { fontFamily: w.fontRegular }]}>{otherNews.trim()}</Text>
            </>
          )}
        </ScrollView>
        {/* Drawn as a sibling BELOW the ScrollView, not a border on `sheet` — see
            the cause note above the diff. This can never end up adjacent to a
            content rule, and isn't subject to the border/overflow-clip interaction
            that most likely caused the doubled line. */}
        <View style={styles.bottomLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // the slide itself — normal navy, with the paper's top/bottom margin built in
  root: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 8,
  },
  // one sheet of paper: cream, edge to edge, square corners, thin ink border
  // on top. The bottom edge is `bottomLine` below, not a border here — see
  // the cause note above the diff.
  sheet: {
    flex: 1,
    backgroundColor: palette.newsprintBg,
    borderTopWidth: 1.5,
    borderColor: palette.newsprintInk,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  bottomLine: { height: 1.5, backgroundColor: palette.newsprintInk },
  content: { paddingHorizontal: space.screenX, paddingTop: space.lg, paddingBottom: space.xxxl },

  // rules — ink at two weights
  ruleThick: { height: 2.5, backgroundColor: palette.newsprintRule },
  ruleThin: { height: 1, backgroundColor: palette.newsprintRule, opacity: 0.6 },

  // MASTHEAD
  masthead: {
    fontSize: 34,
    lineHeight: 40,
    color: palette.newsprintInk,
    textAlign: 'center',
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  mastheadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  metaText: { ...type.micro, letterSpacing: 1, color: palette.newsprintMuted },

  // LEAD STORY — text only, no photo block
  topicLabel: {
    ...type.micro,
    letterSpacing: 1.2,
    color: palette.newsprintMuted,
    marginTop: space.lg,
  },
  headline: { ...type.headline, color: palette.newsprintInk, marginTop: space.xs },
  source: { ...type.micro, color: palette.newsprintMuted, marginTop: space.xs },

  quote: {
    borderLeftWidth: 2,
    paddingLeft: space.md,
    marginTop: space.md,
  },
  quoteText: {
    ...type.body,
    // real italic glyphs (fonts.mastheadQuote), not a synthesized fontStyle
    color: palette.newsprintInk,
    opacity: 0.85,
  },

  // OTHER SELECTED STORIES — comments share the `quote`/`quoteText` style above
  otherHeadline: { ...type.bodySmall, color: palette.newsprintInk, marginTop: space.xs },

  // SECTION HEADINGS — "On this day" and "In other news" share this one
  // style (fontFamily set here, not inline, since it's constant either way).
  sectionHeading: {
    ...type.headline, // 20pt/27 — clearly larger than bodyText (15pt) below it
    fontFamily: fonts.masthead,
    color: palette.newsprintInk,
    textAlign: 'center',
    marginBottom: space.sm,
  },

  // ON THIS DAY — factHeading is the "On this day in {year}" line;
  // bodyText (event text here, and the "In other news" text below) is shared
  // between both sections per the spec.
  factHeading: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: palette.newsprintInk,
  },
  bodyText: { fontSize: 15, lineHeight: 21, color: palette.newsprintInk, marginTop: space.xs },
});
