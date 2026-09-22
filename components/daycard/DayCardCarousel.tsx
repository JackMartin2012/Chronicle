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
import { useDayCardData } from '@/lib/dayCardExtras';

import SlideCameraRoll from './SlideCameraRoll';
import SlideCapture from './SlideCapture';
import SlideCover from './SlideCover';
import SlideNewspaper from './SlideNewspaper';
import SlideSound from './SlideSound';
import SlideStory from './SlideStory';
import SlideThreeWords from './SlideThreeWords';

const { width: SCREEN_W } = Dimensions.get('window');

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

type Props = {
  world: World;
  /** 'YYYY-MM-DD'. The carousel loads its own data once, on open. */
  dateKey: string;
};

// "18:04" from a capturedAt timestamp; undefined for old captures (no backfill).
const clockTime = (ms?: number) =>
  ms ? new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined;

export default function DayCardCarousel({ world, dateKey }: Props) {
  const w = getWorld(world);
  const data = useDayCardData(dateKey, world);
  const [page, setPage] = useState(0);
  const [listH, setListH] = useState(0);

  // Only slides the day has content for are built (a null slice = hidden), and
  // the dots + "N of M" count what's actually there. The cover always exists.
  // TODO: the map slide goes here, before the newspaper, when it's built.
  //
  // Slides below the cover still render their own sample content until each is
  // wired to its slice of `data` (one at a time); only the show/hide decision
  // is real for them.
  const slides: { subtitle: string; node: React.ReactNode }[] = [];
  if (data) {
    slides.push({ subtitle: '', node: (
      <SlideCover
        world={world}
        date={data.date}
        weather={data.cover.weather}
        mood={data.cover.mood}
        photoCount={data.cover.photoCount}
        people={data.cover.people.length > 0 ? data.cover.people : undefined}
      />
    ) });
    if (data.capture) slides.push({ subtitle: "Today's capture", node: (
      <SlideCapture world={world} captureTime={clockTime(data.capture.capturedAt)} />
    ) });
    if (data.cameraRoll) slides.push({ subtitle: 'Your camera roll', node: (
      <SlideCameraRoll world={world} />
    ) });
    if (data.threeWords) slides.push({ subtitle: '', node: (
      <SlideThreeWords world={world} words={data.threeWords.words} mood={data.threeWords.mood || undefined} />
    ) });
    if (data.story) slides.push({ subtitle: 'Your day', node: (
      <SlideStory world={world} />
    ) });
    if (data.sound) slides.push({ subtitle: 'Sound & screen', node: (
      <SlideSound world={world} />
    ) });
    if (data.newspaper) slides.push({ subtitle: 'Beyond today', node: (
      <SlideNewspaper world={world} />
    ) });
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== page) setPage(next);
  };

  const headerDay = data?.date ?? new Date(`${dateKey}T12:00:00`);
  const weekday = headerDay.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = headerDay.toLocaleDateString('en-GB', { month: 'long' });
  const headerDate = `${weekday} ${headerDay.getDate()} ${month}`;
  const subtitle = slides[page]?.subtitle ?? '';
  const total = slides.length;
  const currentPage = Math.min(page, Math.max(total - 1, 0)) + 1;

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
          {Array.from({ length: total }).map((_, i) =>
            i === currentPage - 1 ? (
              <View key={i} style={[styles.dotActive, { backgroundColor: w.accent }]} />
            ) : (
              <View key={i} style={styles.dot} />
            )
          )}
        </View>
        <Text style={[styles.dotsCaption, { fontFamily: w.fontRegular }]}>
          {currentPage} of {total}
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
