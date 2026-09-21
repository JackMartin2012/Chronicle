import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DayCardCarousel from '@/components/daycard/DayCardCarousel';

// Throwaway screen for checking the day card carousel on device. Not part of
// the app flow.
//   /preview?dateKey=2026-07-24  → that real stored day, read-only
//   /preview                     → a SCRATCH day (2099-01-01) with buttons that
//                                  swap its weather, to check the globe glow.
//                                  Never touches a real day.
const SCRATCH_KEY = '2099-01-01';

const WEATHERS = {
  mild: { weatherEmoji: '🌤️', weatherDescription: 'Partly cloudy', weatherTemp: 15 },
  hot: { weatherEmoji: '☀️', weatherDescription: 'Clear sky', weatherTemp: 29 },
  cold: { weatherEmoji: '🥶', weatherDescription: 'Frost', weatherTemp: 1 },
  rain: { weatherEmoji: '🌧️', weatherDescription: 'Rain', weatherTemp: 12 },
  snow: { weatherEmoji: '🌨️', weatherDescription: 'Snow', weatherTemp: -1 },
} as const;
type Kind = keyof typeof WEATHERS;

export default function Preview() {
  const { dateKey } = useLocalSearchParams<{ dateKey?: string }>();
  const [kind, setKind] = useState<Kind>('mild');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (dateKey) return;
    setReady(false);
    AsyncStorage.setItem(`day_entry_${SCRATCH_KEY}`, JSON.stringify(WEATHERS[kind])).then(() =>
      setReady(true)
    );
  }, [kind, dateKey]);

  if (dateKey) return <DayCardCarousel world="present" dateKey={dateKey} />;

  return (
    <View style={{ flex: 1 }}>
      {ready && <DayCardCarousel key={kind} world="present" dateKey={SCRATCH_KEY} />}
      <SafeAreaView style={styles.chips} edges={['bottom']} pointerEvents="box-none">
        {(Object.keys(WEATHERS) as Kind[]).map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setKind(k)}
            style={[styles.chip, k === kind && styles.chipOn]}
          >
            <Text style={styles.chipText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.35)' },
  chipText: { color: '#fff', fontSize: 12 },
});
