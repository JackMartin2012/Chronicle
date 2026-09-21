// Chronicle — gathers the "live extras" for a day card and builds DayCardData.
//
// Runs ONCE when the carousel opens (see useDayCardData); slides never call
// MediaLibrary or storage themselves. Everything here is read-only and
// on-device apart from the news archive, which goes through newsFeed's
// existing 30-day cache.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';

import { loadNewsForDay } from '@/components/newsFeed';

import {
  buildDayCardData,
  readLegacyWeather,
  type CameraRollExtras,
  type CameraRollItem,
  type DayCardData,
  type LegacyWeather,
  type LiveExtras,
} from './dayCardData';
import { loadDayEntry } from './dayEntry';

// Cap on assets whose localUri we resolve. Each getAssetInfoAsync is awaited one
// at a time (a parallel burst is noticeably slower on device), so keep it small;
// the COUNTS come from totalCount and are not capped.
const MAX_PHOTO_ITEMS = 20;
const MAX_VIDEO_ITEMS = 4;

const dayBounds = (dateKey: string) => {
  const anchor = new Date(`${dateKey}T12:00:00`);
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Query the day's camera roll. Never PROMPTS for permission — opening a card
 * shouldn't throw up a system dialog; if access isn't already granted the
 * photo count and the Camera Roll slide are simply absent.
 */
export const queryCameraRoll = async (dateKey: string): Promise<CameraRollExtras> => {
  const empty = (status: CameraRollExtras['status']): CameraRollExtras => ({
    status,
    photoCount: 0,
    videoCount: 0,
    items: [],
  });

  try {
    const perm = await MediaLibrary.getPermissionsAsync();
    if (!perm.granted) return empty('denied');

    const { start, end } = dayBounds(dateKey);
    const range = {
      createdAfter: start.getTime(),
      createdBefore: end.getTime(),
      sortBy: [MediaLibrary.SortBy.creationTime],
    };
    const [photos, videos] = await Promise.all([
      MediaLibrary.getAssetsAsync({ ...range, mediaType: 'photo', first: MAX_PHOTO_ITEMS }),
      MediaLibrary.getAssetsAsync({ ...range, mediaType: 'video', first: MAX_VIDEO_ITEMS }),
    ]);

    const items: CameraRollItem[] = [];
    const resolve = async (assets: MediaLibrary.Asset[], kind: 'photo' | 'video') => {
      for (const asset of assets) {
        // raw asset.uri is a ph:// reference on iOS and won't render
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        const uri = info.localUri || info.uri;
        if (!uri) continue;
        items.push({
          id: asset.id,
          uri,
          kind,
          takenAt: asset.creationTime,
          durationSec: kind === 'video' ? asset.duration : undefined,
        });
      }
    };
    await resolve(photos.assets, 'photo');
    await resolve(videos.assets, 'video');
    items.sort((a, b) => a.takenAt - b.takenAt);

    return {
      status: 'granted',
      photoCount: photos.totalCount,
      videoCount: videos.totalCount,
      items,
    };
  } catch (e) {
    console.warn('Camera roll query failed', e);
    return empty('unavailable');
  }
};

/** Legacy weather sits at the top level of the raw record, outside DayEntry. */
const loadLegacyWeather = async (dateKey: string): Promise<LegacyWeather | null> => {
  try {
    const raw = await AsyncStorage.getItem(`day_entry_${dateKey}`);
    return raw ? readLegacyWeather(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const loadArchive = async (dateKey: string) => {
  try {
    const { cache } = await loadNewsForDay(dateKey);
    return cache?.wikipedia?.archive ?? [];
  } catch {
    return [];
  }
};

export const loadDayCardData = async (
  dateKey: string,
  world: 'past' | 'present'
): Promise<DayCardData> => {
  const [entry, cameraRoll, weather, archive] = await Promise.all([
    loadDayEntry(dateKey),
    queryCameraRoll(dateKey),
    loadLegacyWeather(dateKey),
    loadArchive(dateKey),
  ]);
  const extras: LiveExtras = { cameraRoll, weather, archive };
  return buildDayCardData(entry, extras, world);
};

/** Loads once per (dateKey, world) — the carousel opening, not every render. */
export const useDayCardData = (dateKey: string, world: 'past' | 'present') => {
  const [data, setData] = useState<DayCardData | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    loadDayCardData(dateKey, world).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [dateKey, world]);
  return data;
};
