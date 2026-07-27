import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';

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
};

// TODO: real world-news / archive / reflection data; sample copy for now.
const DATELINE = 'Thursday 24 July 2026';
const LEAD = {
  headline: 'Global climate summit reaches historic agreement on ocean protection',
  source: 'BBC · 14:02',
  reaction: "Didn't expect it to happen this fast. Everyone at work talked about nothing else.",
};
const ARCHIVE = [
  { year: '1969', event: 'Apollo 11 returns to Earth' },
  { year: '1983', event: 'The first mobile phone call is made in the UK' },
];
const REFLECTION = {
  question: 'What are you looking forward to?',
  answer: 'Getting the keys in September. Making that flat feel like ours.',
};

// Slide 8 — "Beyond today". A physical newspaper page, DARK (white ink on
// blue-black). Diegetic exception: masthead + headlines use the serif (Fraunces)
// even in the Present world — it's part of the newspaper object. Chrome from carousel.
export default function SlideNewspaper({ world }: Props) {
  const w = getWorld(world);

  return (
    <ScrollView style={[styles.root, { backgroundColor: w.bg }]} contentContainerStyle={styles.content}>
      {/* MASTHEAD */}
      <View style={styles.ruleThick} />
      <Text style={[styles.masthead, { fontFamily: fonts.masthead }]}>Chronicle</Text>
      <View style={styles.ruleThin} />
      <View style={styles.mastheadMeta}>
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>{DATELINE}</Text>
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>The day in the world</Text>
      </View>

      {/* LEAD STORY */}
      <View style={[styles.leadPhoto, { backgroundColor: w.surface }]}>
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', w.bg]}
          style={styles.leadScrim}
        />
      </View>
      <Text style={[styles.headline, { fontFamily: fonts.masthead }]}>{LEAD.headline}</Text>
      <Text style={[styles.source, { fontFamily: w.fontRegular }]}>{LEAD.source}</Text>

      <View style={[styles.quote, { borderLeftColor: withAlpha(w.accent, 0.3) }]}>
        <Text style={[styles.quoteText, { fontFamily: w.fontRegular }]}>“{LEAD.reaction}”</Text>
      </View>

      <View style={[styles.ruleThin, { marginVertical: space.lg }]} />

      {/* FROM THE ARCHIVE */}
      <Text style={[styles.archiveHeading, { fontFamily: fonts.mastheadBody }]}>From the archive</Text>
      <View style={styles.archiveRow}>
        <View style={styles.archiveCol}>
          <Text style={[styles.archiveText, { fontFamily: w.fontRegular }]}>
            <Text style={[styles.archiveYear, { fontFamily: w.fontBold }]}>{ARCHIVE[0].year}</Text>
            {`  ${ARCHIVE[0].event}`}
          </Text>
        </View>
        <View style={styles.archiveDivider} />
        <View style={styles.archiveCol}>
          <Text style={[styles.archiveText, { fontFamily: w.fontRegular }]}>
            <Text style={[styles.archiveYear, { fontFamily: w.fontBold }]}>{ARCHIVE[1].year}</Text>
            {`  ${ARCHIVE[1].event}`}
          </Text>
        </View>
      </View>

      <View style={[styles.ruleThick, { marginVertical: space.lg }]} />

      {/* THE REFLECTION — a note resting ON the newspaper */}
      <View style={styles.note}>
        <Text style={[styles.noteLabel, { fontFamily: w.fontRegular }]}>For future you</Text>
        <Text style={[styles.noteQuestion, { fontFamily: w.fontRegular }]}>{REFLECTION.question}</Text>
        <Text style={[styles.noteAnswer, { fontFamily: w.fontRegular }]}>{REFLECTION.answer}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // generous bottom padding so the tilted reflection note clears the page dots
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

  // LEAD STORY
  leadPhoto: {
    width: '100%',
    height: 150,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginTop: space.lg,
  },
  leadScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  headline: { ...type.headline, color: palette.textPrimary, marginTop: space.md },
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

  // FROM THE ARCHIVE
  archiveHeading: { ...type.caption, color: palette.textSecondary, marginBottom: space.sm },
  archiveRow: { flexDirection: 'row' },
  archiveCol: { flex: 1 },
  archiveDivider: {
    width: 1,
    backgroundColor: palette.textPrimary,
    opacity: 0.2,
    marginHorizontal: space.md,
  },
  archiveText: { ...type.caption, color: palette.textSecondary },
  archiveYear: { color: palette.textPrimary },

  // THE REFLECTION — warm note, tilted, soft shadow, NOT a bordered card
  note: {
    backgroundColor: palette.polaroidInk, // warm dark tone (#2a2622)
    borderRadius: radius.md,
    padding: space.base,
    marginHorizontal: space.sm,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  noteLabel: { ...type.micro, color: palette.textMuted },
  noteQuestion: { ...type.bodySmall, color: palette.textPrimary, marginTop: space.xs },
  noteAnswer: { ...type.body, color: palette.textPrimary, opacity: 0.85, marginTop: space.xs },
});
