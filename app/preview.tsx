import { useLocalSearchParams } from 'expo-router';

import DayCardCarousel from '@/components/daycard/DayCardCarousel';
import { todayKey } from '@/lib/dayEntry';

// Throwaway screen for checking the day card carousel against a real stored
// day. Not part of the app flow. Open /preview for today, or /preview?dateKey=2026-07-24.
export default function Preview() {
  const { dateKey } = useLocalSearchParams<{ dateKey?: string }>();
  return <DayCardCarousel world="present" dateKey={dateKey || todayKey()} />;
}
