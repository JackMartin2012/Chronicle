import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { getWorld, palette, sizes, space, type, weatherFromTemp, weatherGlowColor } from '@/constants/chronicleTheme';
import type { LegacyWeather } from '@/lib/dayCardData';

type Person = { name: string; photoUri?: string };

type Props = {
  world: 'past' | 'present';
  date: Date;
  weather?: LegacyWeather;
  mood?: string;
  photoCount?: number;
  people?: Person[];
};

// "Spent with Alex, Sam & Mum" — commas between all but the last, "&" before the last.
function spentWithLine(people: Person[]): string {
  const names = people.map((p) => p.name).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return `Spent with ${names[0]}`;
  const last = names[names.length - 1];
  return `Spent with ${names.slice(0, -1).join(', ')} & ${last}`;
}

// Body only — the top bar and page dots now come from DayCardCarousel's shared chrome.
export default function SlideCover({ world, date, weather, mood, photoCount, people }: Props) {
  const w = getWorld(world);

  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const dateLine = `${date.getDate()} ${month}`;
  const year = `${date.getFullYear()}`;

  // Weather tints the globe's glow by COLOUR TEMPERATURE. hot/cold/snow use an
  // explicit saturated colour (see weatherGlowColor) so they read as that
  // colour on sight; mild resolves back to the plain world accent.
  const glowColor = weatherGlowColor(w.accent, weather ? weatherFromTemp(weather.temp, weather.description.toLowerCase()) : 'mild');

  const hasPeople = !!people && people.length > 0;

  // Metadata row items — each omitted when its value is undefined.
  const metaItems: React.ReactNode[] = [];
  if (weather) {
    // the day's own weather emoji when we have one; the generic icon otherwise
    metaItems.push(
      <View key="weather" style={styles.metaItem}>
        {weather.emoji ? (
          <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
        ) : (
          <Ionicons name="sunny-outline" size={15} color={palette.textSecondary} />
        )}
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>{Math.round(weather.temp)}°</Text>
      </View>
    );
  }
  if (mood !== undefined) {
    metaItems.push(
      <Text key="mood" style={styles.moodEmoji}>
        {mood}
      </Text>
    );
  }
  if (photoCount !== undefined) {
    metaItems.push(
      <View key="photos" style={styles.metaItem}>
        <Ionicons name="images-outline" size={15} color={palette.textSecondary} />
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>{photoCount}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* DATE BLOCK */}
      <View style={styles.dateBlock}>
        <Text style={[styles.weekday, { fontFamily: w.fontRegular }]}>{weekday}</Text>
        <Text style={[styles.dateHero, { fontFamily: w.fontBold }]}>{dateLine}</Text>
        <Text style={[styles.year, { fontFamily: w.fontRegular }]}>{year}</Text>
      </View>

      {/* METADATA ROW */}
      <View style={styles.metaRow}>
        {metaItems.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.metaSeparator} />}
            {item}
          </React.Fragment>
        ))}
      </View>

      {/* GLOBE */}
      <View style={styles.globeContainer}>
        {/* TEMP debug — value computed by blendWeatherGlow vs. the value actually
            landing on this View's shadowColor prop, read from the exact object
            React is about to apply below. Remove both once confirmed on device. */}
        {(() => {
          const glowStyle = { shadowColor: glowColor };
          return (
            <>
              <Text style={styles.debugGlow}>
                {`computed: ${glowColor}\nat-prop: ${glowStyle.shadowColor}`}
              </Text>
              <View style={[styles.glowWrap, glowStyle]}>
                <Image source={require('@/assets/images/globe.png')} resizeMode="contain" style={styles.globe} />
                <View style={styles.pinContainer}>
                  <View style={[styles.pinRing, { borderColor: w.accent }]} />
                  <View style={[styles.pinDot, { backgroundColor: w.accent }]} />
                </View>
              </View>
            </>
          );
        })()}
      </View>

      {/* PEOPLE */}
      {hasPeople && (
        <View style={styles.peopleBlock}>
          <View style={styles.peopleRow}>
            {people!.slice(0, 4).map((person, i) =>
              person.photoUri ? (
                <Image key={i} source={{ uri: person.photoUri }} style={styles.personPhoto} />
              ) : (
                <View key={i} style={[styles.personFallback, { backgroundColor: w.surface }]}>
                  <Text style={[styles.personInitial, { fontFamily: w.fontMedium }]}>
                    {person.name.charAt(0)}
                  </Text>
                </View>
              )
            )}
          </View>
          <Text style={[styles.peopleCaption, { fontFamily: w.fontRegular }]}>
            {spentWithLine(people!)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screenX },

  dateBlock: { alignItems: 'center', marginTop: space.lg },
  weekday: { ...type.label, color: palette.textSecondary, marginBottom: 2 },
  dateHero: { ...type.dateHero, color: palette.textPrimary },
  year: { ...type.headline, color: palette.textMuted, marginTop: 2 },

  metaRow: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...type.caption, color: palette.textSecondary, marginLeft: 4 },
  moodEmoji: { fontSize: 17 },
  weatherEmoji: { fontSize: 15 },
  metaSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.textFaint,
    marginHorizontal: space.md,
  },

  globeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  debugGlow: { position: 'absolute', top: 4, alignSelf: 'center', color: '#ff0', fontSize: 11, zIndex: 9 },
  // A tight, defined ring hugging the globe's silhouette (per the Stitch mock) —
  // NOT an ambient bloom. Small radius + high opacity so it reads as an outline
  // on the sphere, not a diffuse spread into the background. A wide/soft glow
  // is too thin per-pixel for any hue to register regardless of shadowColor —
  // confirmed on device (see 09_CODE_NOTES.md).
  glowWrap: {
    width: sizes.globeDiameter,
    height: sizes.globeDiameter,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  globe: {
    width: sizes.globeDiameter,
    height: sizes.globeDiameter,
  },
  pinContainer: {
    position: 'absolute',
    top: 22,
    right: 22,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    opacity: 0.35,
  },
  pinDot: { width: 10, height: 10, borderRadius: 5 },

  peopleBlock: { alignItems: 'center', marginBottom: space.xl },
  peopleRow: { flexDirection: 'row' },
  personPhoto: {
    width: sizes.personSmall,
    height: sizes.personSmall,
    borderRadius: sizes.personSmall / 2,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: palette.ringSubtle,
  },
  personFallback: {
    width: sizes.personSmall,
    height: sizes.personSmall,
    borderRadius: sizes.personSmall / 2,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: palette.ringSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInitial: { ...type.caption, color: palette.textSecondary },
  peopleCaption: { ...type.caption, color: palette.textMuted, marginTop: space.sm },
});
