import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getWorld, palette, sizes, space, type, World } from '@/constants/chronicleTheme';

import SlideCameraRoll from './SlideCameraRoll';
import SlideCapture from './SlideCapture';
import SlideCover from './SlideCover';
import SlideNewspaper from './SlideNewspaper';
import SlideSound from './SlideSound';
import SlideStory from './SlideStory';
import SlideThreeWords from './SlideThreeWords';

const { width: SCREEN_W } = Dimensions.get('window');

// The finished day card is eight slides; only the first two are built so far,
// but the dots + "N of 8" reflect the full set.
const TOTAL_SLIDES = 8;

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

// Inline sample-day shape (presentation only — no storage/navigation wiring).
export type SampleDay = {
  date: Date;
  weatherTemp?: number;
  mood?: string;
  photoCount?: number;
  people?: { name: string; photoUri?: string }[];
  captureTime?: string;
};

type Props = {
  world: World;
  day: SampleDay;
};

export default function DayCardCarousel({ world, day }: Props) {
  const w = getWorld(world);
  const [page, setPage] = useState(0);
  const [listH, setListH] = useState(0);

  // Each entry: the slide body, the subtitle the shared top bar shows for it, and
  // its 1-based pageNumber (drives the dots + "N of 8"). pageNumber is explicit so
  // the newspaper stays pinned to 8 even though slide 7 isn't built yet.
  const slides = [
    { pageNumber: 1, subtitle: '', node: (
      <SlideCover
        world={world}
        date={day.date}
        weatherTemp={day.weatherTemp}
        mood={day.mood}
        photoCount={day.photoCount}
        people={day.people}
      />
    ) },
    { pageNumber: 2, subtitle: "Today's capture", node: (
      <SlideCapture world={world} captureTime={day.captureTime} />
    ) },
    { pageNumber: 3, subtitle: 'Your camera roll', node: (
      <SlideCameraRoll world={world} />
    ) },
    { pageNumber: 4, subtitle: '', node: (
      <SlideThreeWords world={world} />
    ) },
    { pageNumber: 5, subtitle: 'Your day', node: (
      <SlideStory world={world} />
    ) },
    { pageNumber: 6, subtitle: 'Sound & screen', node: (
      <SlideSound world={world} />
    ) },
    // TODO: the map slide (pageNumber 7) goes here, before the newspaper.
    { pageNumber: 8, subtitle: 'Beyond today', node: (
      <SlideNewspaper world={world} />
    ) },
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== page) setPage(next);
  };

  const weekday = day.date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = day.date.toLocaleDateString('en-GB', { month: 'long' });
  const headerDate = `${weekday} ${day.date.getDate()} ${month}`;
  const subtitle = slides[page]?.subtitle ?? '';
  // displayed page number for the active slide (not the raw array index)
  const currentPage = slides[page]?.pageNumber ?? page + 1;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: w.bg }]} edges={['top', 'bottom']}>
      {/* SHARED TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topSide} hitSlop={HIT} onPress={() => {}}>
          <Ionicons name="chevron-down" size={26} color={palette.textSecondary} />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={[styles.headerDate, { fontFamily: w.fontRegular }]}>{headerDate}</Text>
          {subtitle.length > 0 && (
            <Text style={[styles.headerSubtitle, { fontFamily: w.fontRegular }]}>{subtitle}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.topSide} hitSlop={HIT} onPress={() => {}}>
          <Ionicons name="share-outline" size={22} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* PAGED SLIDES */}
      <View style={styles.listWrap} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
        <FlatList
          data={slides}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W, height: listH }}>{item.node}</View>
          )}
        />
      </View>

      {/* SHARED PAGE DOTS */}
      <View style={styles.dotsBlock}>
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) =>
            i === currentPage - 1 ? (
              <View key={i} style={[styles.dotActive, { backgroundColor: w.accent }]} />
            ) : (
              <View key={i} style={styles.dot} />
            )
          )}
        </View>
        <Text style={[styles.dotsCaption, { fontFamily: w.fontRegular }]}>
          {currentPage} of {TOTAL_SLIDES}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screenX,
    paddingVertical: space.sm,
  },
  topSide: { width: 40, alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  headerDate: { ...type.caption, color: palette.textSecondary },
  headerSubtitle: { ...type.micro, color: palette.textMuted, marginTop: 2 },

  listWrap: { flex: 1 },

  dotsBlock: { alignItems: 'center', paddingVertical: space.base },
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
