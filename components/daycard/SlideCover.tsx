import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getWorld, palette, sizes, space, type } from '@/constants/chronicleTheme';

type Person = { name: string; photoUri?: string };

type Props = {
  world: 'past' | 'present';
  date: Date;
  weatherTemp?: number;
  weatherCondition?: string;
  mood?: string;
  photoCount?: number;
  people?: Person[];
  onDismiss: () => void;
  onShare: () => void;
};

// "Spent with Alex, Sam & Mum" — commas between all but the last, "&" before the last.
function spentWithLine(people: Person[]): string {
  const names = people.map((p) => p.name).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return `Spent with ${names[0]}`;
  const last = names[names.length - 1];
  return `Spent with ${names.slice(0, -1).join(', ')} & ${last}`;
}

export default function SlideCover({
  world,
  date,
  weatherTemp,
  mood,
  photoCount,
  people,
  onDismiss,
  onShare,
}: Props) {
  const w = getWorld(world);

  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const dateLine = `${date.getDate()} ${month}`;
  const year = `${date.getFullYear()}`;

  const hasPeople = !!people && people.length > 0;

  // Metadata row items — each omitted when its value is undefined.
  const metaItems: React.ReactNode[] = [];
  if (weatherTemp !== undefined) {
    metaItems.push(
      <View key="weather" style={styles.metaItem}>
        <Ionicons name="sunny-outline" size={15} color={palette.textSecondary} />
        <Text style={[styles.metaText, { fontFamily: w.fontRegular }]}>{weatherTemp}°</Text>
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
    <SafeAreaView style={[styles.root, { backgroundColor: w.bg }]}>
      {/* 1. TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-down" size={26} color={palette.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="share-outline" size={22} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 2. DATE BLOCK */}
      <View style={styles.dateBlock}>
        <Text style={[styles.weekday, { fontFamily: w.fontRegular }]}>{weekday}</Text>
        <Text style={[styles.dateHero, { fontFamily: w.fontBold }]}>{dateLine}</Text>
        <Text style={[styles.year, { fontFamily: w.fontRegular }]}>{year}</Text>
      </View>

      {/* 3. METADATA ROW */}
      <View style={styles.metaRow}>
        {metaItems.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.metaSeparator} />}
            {item}
          </React.Fragment>
        ))}
      </View>

      {/* 4. GLOBE */}
      <View style={styles.globeContainer}>
        <View style={[styles.glowWrap, { shadowColor: w.accent }]}>
          <View style={styles.globeCircle}>
            {/* TODO replace with assets/images/globe.png */}
            <LinearGradient
              colors={['rgba(40,60,90,0.9)', 'rgba(6,10,18,1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={styles.pinContainer}>
            <View style={[styles.pinRing, { borderColor: w.accent }]} />
            <View style={[styles.pinDot, { backgroundColor: w.accent }]} />
          </View>
        </View>
      </View>

      {/* 5. PEOPLE */}
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

      {/* 6. PAGE DOTS */}
      <View style={styles.dotsBlock}>
        <View style={styles.dotsRow}>
          {Array.from({ length: 8 }).map((_, i) =>
            i === 0 ? (
              <View key={i} style={[styles.dotActive, { backgroundColor: w.accent }]} />
            ) : (
              <View key={i} style={styles.dot} />
            )
          )}
        </View>
        <Text style={[styles.dotsCaption, { fontFamily: w.fontRegular }]}>1 of 8</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screenX },

  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

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
  metaSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.textFaint,
    marginHorizontal: space.md,
  },

  globeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowWrap: {
    width: sizes.globeDiameter,
    height: sizes.globeDiameter,
    borderRadius: sizes.globeDiameter / 2,
    backgroundColor: '#0a1220', // TODO replace with assets/images/globe.png
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  globeCircle: {
    width: sizes.globeDiameter,
    height: sizes.globeDiameter,
    borderRadius: sizes.globeDiameter / 2,
    overflow: 'hidden',
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

  dotsBlock: { alignItems: 'center', marginBottom: space.base },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: sizes.pageDot,
    height: sizes.pageDot,
    borderRadius: sizes.pageDot / 2,
    marginHorizontal: 4,
    backgroundColor: palette.textFaint,
  },
  dotActive: {
    width: sizes.pageDotActive,
    height: sizes.pageDotActive,
    borderRadius: sizes.pageDotActive / 2,
    marginHorizontal: 4,
  },
  dotsCaption: { ...type.micro, color: palette.textMuted, marginTop: space.sm },
});
